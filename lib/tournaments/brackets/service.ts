import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { assertReclubSessionPlayable } from "@/lib/tournaments/reclub/session-guard";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type BracketMatchView = {
  id: string; roundNumber: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
  status: string;
  nextMatchId: string | null;
};

async function getBracketTeamPlayers(teamIds: string[]): Promise<Map<string, string[]>> {
  if (!teamIds.length) return new Map();

  const rows = await getDb()
    .select({
      teamId: tournamentTeamMembers.teamId,
      displayName: sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name})`,
      slotIndex: tournamentTeamMembers.slotIndex,
    })
    .from(tournamentTeamMembers)
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(inArray(tournamentTeamMembers.teamId, teamIds))
    .orderBy(asc(tournamentTeamMembers.slotIndex));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.teamId) ?? [];
    list.push(row.displayName);
    map.set(row.teamId, list);
  }
  return map;
}

export async function listBracketMatches(tournamentId: string): Promise<BracketMatchView[]> {
  const rows = await getDb()
    .select()
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId))
    .orderBy(
      asc(tournamentBracketMatches.roundNumber),
      asc(tournamentBracketMatches.matchNumber),
    );

  const teamIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.teamAId, row.teamBId])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const playersByTeam = await getBracketTeamPlayers(teamIds);

  return rows.map((r) => ({
    id: r.id,
    roundNumber: r.roundNumber,
    matchNumber: r.matchNumber,
    teamAId: r.teamAId,
    teamBId: r.teamBId,
    teamAName: r.teamAName,
    teamBName: r.teamBName,
    teamAPlayers: r.teamAId ? (playersByTeam.get(r.teamAId) ?? []) : [],
    teamBPlayers: r.teamBId ? (playersByTeam.get(r.teamBId) ?? []) : [],
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    winnerTeamId: r.winnerTeamId,
    status: r.status,
    nextMatchId: r.nextMatchId,
  }));
}

export async function submitBracketMatchScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  scoreA: number,
  scoreB: number,
): Promise<BracketMatchView> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use bracket scoring", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const db = getDb();
  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, matchId),
        eq(tournamentBracketMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (!match) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (tournament.tournamentType === "official" && tournament.status !== "live") {
    throw new AppError("Official scores can only be submitted while the tournament is live", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (
    tournament.tournamentType === "recreational" &&
    match.status !== "in_progress"
  ) {
    assertReclubSessionPlayable(tournament);
  }

  if (match.status === "completed" || match.status === "bye") {
    throw new AppError("Match already completed", { code: "CONFLICT", statusCode: 409 });
  }

  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Both teams must be set before scoring", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (scoreA === scoreB) {
    throw new AppError("Scores cannot be tied in elimination bracket", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
  const [winner] = await db
    .select({ name: tournamentTeams.name })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.id, winnerTeamId))
    .limit(1);

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      scoreA,
      scoreB,
      winnerTeamId,
      status: "completed",
      completedAt: new Date(),
      recordedByUserId: userId,
    })
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update match", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const isFinal = !match.nextMatchId;

  if (match.nextMatchId && winner) {
    const [next] = await db
      .select()
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.id, match.nextMatchId))
      .limit(1);

    if (next) {
      const slotA = next.teamAId == null;
      await db
        .update(tournamentBracketMatches)
        .set(
          slotA
            ? { teamAId: winnerTeamId, teamAName: winner.name }
            : { teamBId: winnerTeamId, teamBName: winner.name },
        )
        .where(eq(tournamentBracketMatches.id, next.id));
    }
  }

  const { getTeamMemberUserIds } = await import("@/lib/tournaments/brackets/leaderboard");
  const { syncOfficialPlacement, syncReclubBracketResult } = await import(
    "@/lib/tournaments/stats/sync"
  );
  const { getBracketRoundLabel } = await import("@/lib/tournaments/brackets/round-labels");

  if (tournament.tournamentType === "recreational") {
    const teamAIds = match.teamAId ? await getTeamMemberUserIds(match.teamAId) : [];
    const teamBIds = match.teamBId ? await getTeamMemberUserIds(match.teamBId) : [];
    const totalRounds = await db
      .select({ roundNumber: tournamentBracketMatches.roundNumber })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    const maxRound = Math.max(...totalRounds.map((r) => r.roundNumber), 1);
    await syncReclubBracketResult({
      tournament,
      roundLabel: getBracketRoundLabel(match.roundNumber, maxRound),
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA,
      scoreB,
      participantUserIds: [...teamAIds, ...teamBIds],
      placement: isFinal ? "Champion" : undefined,
    });

    const { recordBracketMatchInSessionHistory } = await import(
      "@/lib/tournaments/reclub/session-history"
    );
    await recordBracketMatchInSessionHistory(tournament, updated, userId);
  } else if (isFinal && winnerTeamId) {
    const memberIds = await getTeamMemberUserIds(winnerTeamId);
    for (const uid of memberIds) {
      await syncOfficialPlacement({
        tournament,
        userId: uid,
        placement: "Champion",
        placementRank: 1,
      });
    }
  }

  return {
    id: updated.id,
    roundNumber: updated.roundNumber,
    matchNumber: updated.matchNumber,
    teamAId: updated.teamAId,
    teamBId: updated.teamBId,
    teamAName: updated.teamAName,
    teamBName: updated.teamBName,
    teamAPlayers: match.teamAId ? (await getBracketTeamPlayers([match.teamAId])).get(match.teamAId) ?? [] : [],
    teamBPlayers: match.teamBId ? (await getBracketTeamPlayers([match.teamBId])).get(match.teamBId) ?? [] : [],
    scoreA: updated.scoreA,
    scoreB: updated.scoreB,
    winnerTeamId: updated.winnerTeamId,
    status: updated.status,
    nextMatchId: updated.nextMatchId,
  };
}

export async function updateBracketLiveScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  scoreA: number,
  scoreB: number,
): Promise<BracketMatchView> {
  if (tournament.format === "americano") {
    throw new AppError("Americano tournaments do not use bracket scoring", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  const db = getDb();
  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, matchId),
        eq(tournamentBracketMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);

  if (!match) {
    throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (tournament.tournamentType === "official" && tournament.status !== "live") {
    throw new AppError("Official live scores can only be updated while the tournament is live", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (
    tournament.tournamentType === "recreational" &&
    match.status !== "in_progress"
  ) {
    assertReclubSessionPlayable(tournament);
  }

  if (match.status === "completed" || match.status === "bye") {
    throw new AppError("Match already finished", { code: "CONFLICT", statusCode: 409 });
  }

  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Both teams must be set before live scoring", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      scoreA: Math.max(0, Math.min(99, scoreA)),
      scoreB: Math.max(0, Math.min(99, scoreB)),
      status: "in_progress",
      recordedByUserId: userId,
    })
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update score", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return {
    id: updated.id,
    roundNumber: updated.roundNumber,
    matchNumber: updated.matchNumber,
    teamAId: updated.teamAId,
    teamBId: updated.teamBId,
    teamAName: updated.teamAName,
    teamBName: updated.teamBName,
    teamAPlayers: match.teamAId ? (await getBracketTeamPlayers([match.teamAId])).get(match.teamAId) ?? [] : [],
    teamBPlayers: match.teamBId ? (await getBracketTeamPlayers([match.teamBId])).get(match.teamBId) ?? [] : [],
    scoreA: updated.scoreA,
    scoreB: updated.scoreB,
    winnerTeamId: updated.winnerTeamId,
    status: updated.status,
    nextMatchId: updated.nextMatchId,
  };
}

export async function hasBracket(tournamentId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId))
    .limit(1);
  return Boolean(row);
}
