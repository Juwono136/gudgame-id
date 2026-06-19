import "server-only";

import { and, desc, eq, inArray, max } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentReclubMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { getMaxRounds } from "@/lib/tournaments/settings";
import { syncReclubMatchToPlayerHistory } from "@/lib/tournaments/stats/sync";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { mapReclubMatchRow } from "@/lib/tournaments/reclub/match-mapper";
export type { ReclubMatchView, ReclubMatchesListQuery } from "@/lib/tournaments/reclub/types";
export { getReclubMatchHistoryKey } from "@/lib/tournaments/reclub/types";
import type { ReclubMatchView, ReclubMatchesListQuery } from "@/lib/tournaments/reclub/types";

export async function listReclubMatches(tournamentId: string): Promise<ReclubMatchView[]> {
  const { mergeReclubSessionHistory } = await import(
    "@/lib/tournaments/reclub/session-history"
  );
  const rows = await getDb()
    .select()
    .from(tournamentReclubMatches)
    .where(eq(tournamentReclubMatches.tournamentId, tournamentId))
    .orderBy(desc(tournamentReclubMatches.roundNumber));

  const reclubItems = rows.map(mapReclubMatchRow);
  return mergeReclubSessionHistory(tournamentId, reclubItems);
}

export async function listReclubMatchesPaginated(
  tournamentId: string,
  query: ReclubMatchesListQuery,
): Promise<{ items: ReclubMatchView[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const { listMergedReclubSessionHistory } = await import(
    "@/lib/tournaments/reclub/session-history"
  );
  return listMergedReclubSessionHistory(tournamentId, query);
}

export async function getActiveReclubMatch(
  tournamentId: string,
): Promise<ReclubMatchView | null> {
  const [row] = await getDb()
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournamentId),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (!row) return null;
  return mapReclubMatchRow(row);
}

async function getTeamPlayerNames(teamId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ name: user.name })
    .from(tournamentTeamMembers)
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(eq(tournamentTeamMembers.teamId, teamId))
    .orderBy(tournamentTeamMembers.slotIndex);

  return rows.map((r) => r.name).filter(Boolean);
}

export async function startReclubRound(
  tournament: TournamentDetail,
  userId: string,
  teamAId: string,
  teamBId: string,
): Promise<ReclubMatchView> {
  const db = getDb();
  const active = await getActiveReclubMatch(tournament.id);
  if (active) {
    throw new AppError("A round is already in progress", { code: "CONFLICT", statusCode: 409 });
  }

  const [maxRound] = await db
    .select({ max: max(tournamentReclubMatches.roundNumber) })
    .from(tournamentReclubMatches)
    .where(eq(tournamentReclubMatches.tournamentId, tournament.id));

  const roundNumber = Number(maxRound?.max ?? 0) + 1;
  const maxRounds = getMaxRounds(tournament);

  if (maxRounds != null && roundNumber > maxRounds) {
    throw new AppError(`This session is limited to ${maxRounds} round(s).`, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const [teamA] = await db
    .select({ name: tournamentTeams.name })
    .from(tournamentTeams)
    .where(
      and(eq(tournamentTeams.id, teamAId), eq(tournamentTeams.tournamentId, tournament.id)),
    )
    .limit(1);
  const [teamB] = await db
    .select({ name: tournamentTeams.name })
    .from(tournamentTeams)
    .where(
      and(eq(tournamentTeams.id, teamBId), eq(tournamentTeams.tournamentId, tournament.id)),
    )
    .limit(1);

  if (!teamA || !teamB) {
    throw new AppError("Invalid teams", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const [teamAPlayers, teamBPlayers] = await Promise.all([
    getTeamPlayerNames(teamAId),
    getTeamPlayerNames(teamBId),
  ]);

  const [created] = await db
    .insert(tournamentReclubMatches)
    .values({
      tournamentId: tournament.id,
      roundNumber,
      teamAId,
      teamBId,
      teamAName: teamA.name,
      teamBName: teamB.name,
      status: "in_progress",
      startedAt: new Date(),
      recordedByUserId: userId,
      metadata: {
        teamAPlayers,
        teamBPlayers,
        scoreEvents: [],
      },
    })
    .returning();

  if (!created) {
    throw new AppError("Could not start round", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return mapReclubMatchRow(created);
}

export async function completeReclubRound(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  input: { scoreA: number; scoreB: number; durationSeconds: number; summary?: string },
): Promise<ReclubMatchView> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.id, matchId),
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AppError("Active match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const endedAt = new Date();
  const [updated] = await db
    .update(tournamentReclubMatches)
    .set({
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      durationSeconds: input.durationSeconds,
      summary:
        input.summary?.trim() ||
        `${existing.teamAName} ${input.scoreA}–${input.scoreB} ${existing.teamBName}`,
      status: "completed",
      endedAt,
      recordedByUserId: userId,
    })
    .where(eq(tournamentReclubMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not complete match", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const participantIds = await getMatchParticipantUserIds(
    existing.teamAId,
    existing.teamBId,
  );

  await syncReclubMatchToPlayerHistory({
    tournament,
    match: updated,
    participantUserIds: participantIds,
  });

  return mapReclubMatchRow(updated);
}

async function getMatchParticipantUserIds(
  teamAId: string | null,
  teamBId: string | null,
): Promise<string[]> {
  const teamIds = [teamAId, teamBId].filter((id): id is string => id != null);
  if (!teamIds.length) return [];

  const rows = await getDb()
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(inArray(tournamentTeamMembers.teamId, teamIds));

  return [...new Set(rows.map((r) => r.userId))];
}
