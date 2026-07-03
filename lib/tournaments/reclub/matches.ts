import "server-only";

import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentBracketMatches, tournamentReclubMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { assertTeamsNotInActiveBracket } from "@/lib/tournaments/brackets/active-teams";
import { assertTeamsAvailableForCourt } from "@/lib/tournaments/reclub/active-court-lock-server";
import { assertCourtAvailable, listTournamentCourts } from "@/lib/tournaments/courts/service";
import { assertReclubSessionPlayable } from "@/lib/tournaments/reclub/session-guard";
import { getMaxRounds, getTournamentRoundDurationMinutes, getTournamentScoringType } from "@/lib/tournaments/settings";
import { computeTimerEndsAt } from "@/lib/tournaments/scoring/engine";
import { syncOfficialMatchToPlayerHistory, syncReclubMatchToPlayerHistory } from "@/lib/tournaments/stats/sync";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
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
  const matches = await getActiveReclubMatches(tournamentId);
  return matches[0] ?? null;
}

export async function getActiveReclubMatches(tournamentId: string): Promise<ReclubMatchView[]> {
  const rows = await getDb()
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournamentId),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .orderBy(desc(tournamentReclubMatches.roundNumber));

  return rows.map(mapReclubMatchRow);
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

export type StartReclubRoundOptions = {
  courtId?: string;
  playType?: "round" | "friendly";
  bracketMatchId?: string;
  /** When starting multiple courts in one logical round, pass the same sessionRound. */
  sessionRound?: number;
};

export async function startReclubRound(
  tournament: TournamentDetail,
  userId: string,
  teamAId: string,
  teamBId: string,
  options?: string | StartReclubRoundOptions,
): Promise<ReclubMatchView> {
  assertReclubSessionPlayable(tournament);

  const opts: StartReclubRoundOptions =
    typeof options === "string" ? { courtId: options } : (options ?? {});
  const playType = opts.playType ?? "round";

  const db = getDb();
  let resolvedCourtId = opts.courtId;
  if (!resolvedCourtId) {
    const courts = await listTournamentCourts(tournament.id);
    const available = courts.find((c) => !c.activeMatchId);
    if (!available) {
      throw new AppError("All courts are busy — wait for a match to finish or add more courts", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    resolvedCourtId = available.id;
  }
  await assertCourtAvailable(tournament.id, resolvedCourtId);

  const [maxRound] = await db
    .select({ max: max(tournamentReclubMatches.roundNumber) })
    .from(tournamentReclubMatches)
    .where(eq(tournamentReclubMatches.tournamentId, tournament.id));

  let roundNumber =
    opts.sessionRound != null && opts.sessionRound > 0
      ? opts.sessionRound
      : Number(maxRound?.max ?? 0) + 1;
  const maxRounds = getMaxRounds(tournament);

  if (playType === "friendly" && opts.bracketMatchId) {
    const [bracketRow] = await db
      .select({ roundNumber: tournamentBracketMatches.roundNumber })
      .from(tournamentBracketMatches)
      .where(
        and(
          eq(tournamentBracketMatches.id, opts.bracketMatchId),
          eq(tournamentBracketMatches.tournamentId, tournament.id),
        ),
      )
      .limit(1);
    if (bracketRow) {
      roundNumber = bracketRow.roundNumber;
    }
  }

  if (playType !== "friendly" && maxRounds != null) {
    const [{ count: completedRounds }] = await db
      .select({
        count: sql<number>`count(distinct ${tournamentReclubMatches.roundNumber})::int`,
      })
      .from(tournamentReclubMatches)
      .where(
        and(
          eq(tournamentReclubMatches.tournamentId, tournament.id),
          eq(tournamentReclubMatches.status, "completed"),
          sql`coalesce(${tournamentReclubMatches.metadata}->>'playType', 'round') != 'friendly'`,
        ),
      );

    const activeOnRound = await db
      .select({ id: tournamentReclubMatches.id })
      .from(tournamentReclubMatches)
      .where(
        and(
          eq(tournamentReclubMatches.tournamentId, tournament.id),
          eq(tournamentReclubMatches.status, "in_progress"),
          eq(tournamentReclubMatches.roundNumber, roundNumber),
          sql`coalesce(${tournamentReclubMatches.metadata}->>'playType', 'round') != 'friendly'`,
        ),
      )
      .limit(1);

    const existingCompletedOnRound = await db
      .select({ id: tournamentReclubMatches.id })
      .from(tournamentReclubMatches)
      .where(
        and(
          eq(tournamentReclubMatches.tournamentId, tournament.id),
          eq(tournamentReclubMatches.status, "completed"),
          eq(tournamentReclubMatches.roundNumber, roundNumber),
        ),
      )
      .limit(1);

    const isNewRound =
      activeOnRound.length === 0 && existingCompletedOnRound.length === 0;

    if (isNewRound && Number(completedRounds ?? 0) >= maxRounds) {
      throw new AppError(`This session is limited to ${maxRounds} round(s).`, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
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

  await assertTeamsNotInActiveBracket(tournament.id, teamAId, teamBId);

  const activeOnCourts = await getActiveReclubMatches(tournament.id);
  await assertTeamsAvailableForCourt(activeOnCourts, teamAId, teamBId, resolvedCourtId);

  const [teamAPlayers, teamBPlayers] = await Promise.all([
    getTeamPlayerNames(teamAId),
    getTeamPlayerNames(teamBId),
  ]);

  const startedAt = new Date();
  const scoringType = getTournamentScoringType(tournament);
  const timerEndsAt =
    scoringType === "timed"
      ? computeTimerEndsAt(startedAt, getTournamentRoundDurationMinutes(tournament))
      : null;

  const friendlyPlayNumber =
    playType === "friendly"
      ? (
          await db
            .select({ id: tournamentReclubMatches.id })
            .from(tournamentReclubMatches)
            .where(
              and(
                eq(tournamentReclubMatches.tournamentId, tournament.id),
                sql`${tournamentReclubMatches.metadata}->>'playType' = 'friendly'`,
              ),
            )
        ).length + 1
      : null;

  const [created] = await db
    .insert(tournamentReclubMatches)
    .values({
      tournamentId: tournament.id,
      roundNumber,
      courtId: resolvedCourtId,
      teamAId,
      teamBId,
      teamAName: teamA.name,
      teamBName: teamB.name,
      status: "in_progress",
      startedAt,
      timerEndsAt,
      recordedByUserId: userId,
      summary:
        playType === "friendly"
          ? `Friendly · ${teamA.name} vs ${teamB.name}`
          : undefined,
      metadata: {
        teamAPlayers,
        teamBPlayers,
        scoreEvents: [],
        playType,
        playNumber: friendlyPlayNumber ?? undefined,
        bracketMatchId: opts.bracketMatchId,
      },
    })
    .returning();

  if (!created) {
    throw new AppError("Could not start round", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

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
      courtId: null,
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

  if (isOfficialType(tournament.tournamentType)) {
    await syncOfficialMatchToPlayerHistory({
      tournament,
      roundLabel: `Round ${updated.roundNumber}`,
      teamAName: updated.teamAName,
      teamBName: updated.teamBName,
      teamAId: updated.teamAId,
      teamBId: updated.teamBId,
      scoreA: updated.scoreA ?? 0,
      scoreB: updated.scoreB ?? 0,
      participantUserIds: participantIds,
    });
  }

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);

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
