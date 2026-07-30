import "server-only";

import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  playerMatches,
  playerTournamentResults,
} from "@/db/schema/player-competition";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { syncPlayerWikiPerformanceSafe } from "@/lib/account/player-performance/sync-wiki";

export type TeamCompetitiveActivity = {
  scoredMatchCount: number;
  careerMatchCount: number;
  careerPlacementCount: number;
  /** True when hard-removing would break standings / career integrity. */
  hasCompeted: boolean;
};

/**
 * A team "has competed" when it appears in any scored/completed match,
 * or when its members already have career match rows for this tournament.
 * Participation-only placements (Fun Match "Competed") do not block removal —
 * those are cleaned up on a safe hard-remove.
 */
export async function getTeamCompetitiveActivity(
  tournamentId: string,
  teamId: string,
  memberUserIds: string[],
): Promise<TeamCompetitiveActivity> {
  const db = getDb();

  const [reclub] = await db
    .select({ count: count() })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournamentId),
        or(
          eq(tournamentReclubMatches.teamAId, teamId),
          eq(tournamentReclubMatches.teamBId, teamId),
        ),
        or(
          eq(tournamentReclubMatches.status, "completed"),
          sql`${tournamentReclubMatches.scoreA} is not null`,
          sql`${tournamentReclubMatches.scoreB} is not null`,
        ),
      ),
    );

  const [bracket] = await db
    .select({ count: count() })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        or(
          eq(tournamentBracketMatches.teamAId, teamId),
          eq(tournamentBracketMatches.teamBId, teamId),
          eq(tournamentBracketMatches.winnerTeamId, teamId),
        ),
        or(
          eq(tournamentBracketMatches.status, "completed"),
          sql`${tournamentBracketMatches.scoreA} is not null`,
          sql`${tournamentBracketMatches.scoreB} is not null`,
        ),
      ),
    );

  const [group] = await db
    .select({ count: count() })
    .from(tournamentGroupMatches)
    .where(
      and(
        eq(tournamentGroupMatches.tournamentId, tournamentId),
        or(
          eq(tournamentGroupMatches.teamAId, teamId),
          eq(tournamentGroupMatches.teamBId, teamId),
          eq(tournamentGroupMatches.winnerTeamId, teamId),
        ),
        or(
          eq(tournamentGroupMatches.status, "completed"),
          sql`${tournamentGroupMatches.scoreA} is not null`,
          sql`${tournamentGroupMatches.scoreB} is not null`,
        ),
      ),
    );

  const scoredMatchCount =
    Number(reclub?.count ?? 0) + Number(bracket?.count ?? 0) + Number(group?.count ?? 0);

  let careerMatchCount = 0;
  let careerPlacementCount = 0;

  if (memberUserIds.length > 0) {
    const [matches] = await db
      .select({ count: count() })
      .from(playerMatches)
      .where(
        and(
          eq(playerMatches.tournamentId, tournamentId),
          inArray(playerMatches.userId, memberUserIds),
        ),
      );

    const [placements] = await db
      .select({ count: count() })
      .from(playerTournamentResults)
      .where(
        and(
          eq(playerTournamentResults.tournamentId, tournamentId),
          inArray(playerTournamentResults.userId, memberUserIds),
        ),
      );

    careerMatchCount = Number(matches?.count ?? 0);
    careerPlacementCount = Number(placements?.count ?? 0);
  }

  const hasCompeted = scoredMatchCount > 0 || careerMatchCount > 0;

  return {
    scoredMatchCount,
    careerMatchCount,
    careerPlacementCount,
    hasCompeted,
  };
}

export function teamRemovalBlockedError(activity: TeamCompetitiveActivity): AppError {
  const parts: string[] = [];
  if (activity.scoredMatchCount > 0) {
    parts.push(
      `${activity.scoredMatchCount} recorded match${activity.scoredMatchCount === 1 ? "" : "es"}`,
    );
  }
  if (activity.careerMatchCount > 0) {
    parts.push(
      `${activity.careerMatchCount} player career match record${activity.careerMatchCount === 1 ? "" : "s"}`,
    );
  }

  return new AppError(
    `This team cannot be removed because it has already competed (${parts.join(", ")}). Player career statistics and tournament history are preserved. Remove is only allowed for teams that have not played any matches yet.`,
    {
      code: "CONFLICT",
      statusCode: 409,
      context: {
        scoredMatchCount: activity.scoredMatchCount,
        careerMatchCount: activity.careerMatchCount,
        careerPlacementCount: activity.careerPlacementCount,
      },
    },
  );
}

export async function assertTeamCanBeHardRemoved(
  tournamentId: string,
  teamId: string,
  memberUserIds: string[],
): Promise<TeamCompetitiveActivity> {
  const activity = await getTeamCompetitiveActivity(tournamentId, teamId, memberUserIds);
  if (activity.hasCompeted) {
    throw teamRemovalBlockedError(activity);
  }
  return activity;
}

/**
 * Batch helper for manage UI — teams that already competed cannot be hard-removed.
 */
export async function getLockedTeamIdsForRemoval(
  tournamentId: string,
  teamIds: string[],
): Promise<Set<string>> {
  const unique = [...new Set(teamIds.filter(Boolean))];
  const locked = new Set<string>();
  if (unique.length === 0) return locked;

  const db = getDb();

  const reclubRows = await db
    .select({
      teamAId: tournamentReclubMatches.teamAId,
      teamBId: tournamentReclubMatches.teamBId,
    })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournamentId),
        or(
          inArray(tournamentReclubMatches.teamAId, unique),
          inArray(tournamentReclubMatches.teamBId, unique),
        ),
        or(
          eq(tournamentReclubMatches.status, "completed"),
          sql`${tournamentReclubMatches.scoreA} is not null`,
          sql`${tournamentReclubMatches.scoreB} is not null`,
        ),
      ),
    );

  const bracketRows = await db
    .select({
      teamAId: tournamentBracketMatches.teamAId,
      teamBId: tournamentBracketMatches.teamBId,
      winnerTeamId: tournamentBracketMatches.winnerTeamId,
    })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        or(
          inArray(tournamentBracketMatches.teamAId, unique),
          inArray(tournamentBracketMatches.teamBId, unique),
          inArray(tournamentBracketMatches.winnerTeamId, unique),
        ),
        or(
          eq(tournamentBracketMatches.status, "completed"),
          sql`${tournamentBracketMatches.scoreA} is not null`,
          sql`${tournamentBracketMatches.scoreB} is not null`,
        ),
      ),
    );

  const groupRows = await db
    .select({
      teamAId: tournamentGroupMatches.teamAId,
      teamBId: tournamentGroupMatches.teamBId,
      winnerTeamId: tournamentGroupMatches.winnerTeamId,
    })
    .from(tournamentGroupMatches)
    .where(
      and(
        eq(tournamentGroupMatches.tournamentId, tournamentId),
        or(
          inArray(tournamentGroupMatches.teamAId, unique),
          inArray(tournamentGroupMatches.teamBId, unique),
          inArray(tournamentGroupMatches.winnerTeamId, unique),
        ),
        or(
          eq(tournamentGroupMatches.status, "completed"),
          sql`${tournamentGroupMatches.scoreA} is not null`,
          sql`${tournamentGroupMatches.scoreB} is not null`,
        ),
      ),
    );

  for (const row of reclubRows) {
    if (row.teamAId) locked.add(row.teamAId);
    if (row.teamBId) locked.add(row.teamBId);
  }
  for (const row of bracketRows) {
    if (row.teamAId) locked.add(row.teamAId);
    if (row.teamBId) locked.add(row.teamBId);
    if (row.winnerTeamId) locked.add(row.winnerTeamId);
  }
  for (const row of groupRows) {
    if (row.teamAId) locked.add(row.teamAId);
    if (row.teamBId) locked.add(row.teamBId);
    if (row.winnerTeamId) locked.add(row.winnerTeamId);
  }

  // Also lock teams whose members already have career match rows for this tournament
  const memberRows = await db
    .select({
      teamId: tournamentTeamMembers.teamId,
      userId: tournamentTeamMembers.userId,
    })
    .from(tournamentTeamMembers)
    .where(inArray(tournamentTeamMembers.teamId, unique));

  if (memberRows.length > 0) {
    const userIds = [
      ...new Set(
        memberRows.map((m) => m.userId).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (userIds.length > 0) {
      const careerUsers = await db
        .select({ userId: playerMatches.userId })
        .from(playerMatches)
        .where(
          and(
            eq(playerMatches.tournamentId, tournamentId),
            inArray(playerMatches.userId, userIds),
          ),
        );
      const careerUserSet = new Set(careerUsers.map((r) => r.userId));
      for (const member of memberRows) {
        if (member.userId && careerUserSet.has(member.userId)) locked.add(member.teamId);
      }
    }
  }

  return locked;
}

/**
 * After a safe hard-remove (no competed matches), drop leftover participation
 * placements for this tournament and refresh wiki performance rollups.
 */
export async function cleanupUnplayedCompetitionRecords(input: {
  tournamentId: string;
  sportId: string;
  userIds: string[];
}): Promise<void> {
  if (input.userIds.length === 0) return;

  const db = getDb();

  for (const userId of input.userIds) {
    await db
      .delete(playerTournamentResults)
      .where(
        and(
          eq(playerTournamentResults.tournamentId, input.tournamentId),
          eq(playerTournamentResults.userId, userId),
        ),
      );

    await db
      .delete(playerMatches)
      .where(
        and(eq(playerMatches.tournamentId, input.tournamentId), eq(playerMatches.userId, userId)),
      );

    await syncPlayerWikiPerformanceSafe(userId, input.sportId);
  }
}
