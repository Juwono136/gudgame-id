import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { tournamentTeamMembers, tournamentTeams } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import {
  appendBracketScoreEvent,
  parseBracketMatchMetadata,
} from "@/lib/tournaments/brackets/bracket-metadata";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import type { MatchScoreEvent, ScoreChangeMeta } from "@/lib/tournaments/scoring/match-score-events";
import { buildMatchScoreEvent } from "@/lib/tournaments/scoring/build-score-event";
import {
  applyScoreDelta as engineApplyDelta,
  type ScoringRules,
} from "@/lib/tournaments/scoring/engine";
import {
  applyGamePointDelta,
  emptyMatchGameState,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";
import {
  getTournamentDeuceConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type BracketMatchView = {
  id: string;
  roundNumber: number;
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
  courtId: string | null;
  /** Match clock start (from scheduled_at when the match was started on court). */
  startedAt: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  scoreEvents: MatchScoreEvent[];
  gameState?: MatchGameState | null;
};

function buildScoringRules(tournament: TournamentDetail): ScoringRules {
  return {
    pointsPerMatch: getTournamentPointsPerMatch(tournament),
    deuceConfig: getTournamentDeuceConfig(tournament),
    scoringType: getTournamentScoringType(tournament),
  };
}

type BracketMatchRow = typeof tournamentBracketMatches.$inferSelect;

async function mapBracketRowToView(
  row: BracketMatchRow,
  playersByTeam: Map<string, string[]>,
): Promise<BracketMatchView> {
  const meta = parseBracketMatchMetadata(row.metadata);
  return {
    id: row.id,
    roundNumber: row.roundNumber,
    matchNumber: row.matchNumber,
    teamAId: row.teamAId,
    teamBId: row.teamBId,
    teamAName: row.teamAName,
    teamBName: row.teamBName,
    teamAPlayers: row.teamAId ? (playersByTeam.get(row.teamAId) ?? []) : [],
    teamBPlayers: row.teamBId ? (playersByTeam.get(row.teamBId) ?? []) : [],
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    winnerTeamId: row.winnerTeamId,
    status: row.status,
    nextMatchId: row.nextMatchId,
    courtId: row.courtId,
    startedAt: row.scheduledAt?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    scoreEvents: meta.scoreEvents ?? [],
    gameState: meta.gameState ?? null,
  };
}

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

  return Promise.all(rows.map((r) => mapBracketRowToView(r, playersByTeam)));
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

  assertTournamentLiveForScoring(tournament);

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
    throw new AppError(
      "Scores are tied — replay this match before advancing the bracket",
      {
        code: "TIE_REQUIRES_REMATCH",
        statusCode: 422,
      },
    );
  }

  const winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
  const [winner] = await db
    .select({ name: tournamentTeams.name })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.id, winnerTeamId))
    .limit(1);

  const prevMeta = parseBracketMatchMetadata(match.metadata);
  const finalizeMeta = appendBracketScoreEvent(prevMeta, {
    at: new Date().toISOString(),
    userId,
    scoreA,
    scoreB,
    action: "set",
  });

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      scoreA,
      scoreB,
      winnerTeamId,
      status: "completed",
      completedAt: new Date(),
      recordedByUserId: userId,
      courtId: null,
      metadata: finalizeMeta,
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
  const { syncOfficialPlacement, syncOfficialMatchToPlayerHistory, syncReclubBracketResult } =
    await import("@/lib/tournaments/stats/sync");
  const { getBracketRoundLabel } = await import("@/lib/tournaments/brackets/round-labels");

  if (isFunMatchType(tournament.tournamentType)) {
    const teamAIds = match.teamAId ? await getTeamMemberUserIds(match.teamAId) : [];
    const teamBIds = match.teamBId ? await getTeamMemberUserIds(match.teamBId) : [];
    const totalRounds = await db
      .select({ roundNumber: tournamentBracketMatches.roundNumber })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    const maxRound = Math.max(...totalRounds.map((r) => r.roundNumber), 1);
    const roundLabel = getBracketRoundLabel(match.roundNumber, maxRound);
    await syncReclubBracketResult({
      tournament,
      roundLabel,
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
  } else {
    const teamAIds = match.teamAId ? await getTeamMemberUserIds(match.teamAId) : [];
    const teamBIds = match.teamBId ? await getTeamMemberUserIds(match.teamBId) : [];
    const totalRounds = await db
      .select({ roundNumber: tournamentBracketMatches.roundNumber })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    const maxRound = Math.max(...totalRounds.map((r) => r.roundNumber), 1);
    await syncOfficialMatchToPlayerHistory({
      tournament,
      roundLabel: getBracketRoundLabel(match.roundNumber, maxRound),
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA,
      scoreB,
      participantUserIds: [...teamAIds, ...teamBIds],
    });

    if (isFinal && winnerTeamId) {
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
  }

  const playersByTeam = await getBracketTeamPlayers(
    [updated.teamAId, updated.teamBId].filter((id): id is string => Boolean(id)),
  );
  return mapBracketRowToView(updated, playersByTeam);
}

export async function updateBracketLiveScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  userName: string | null,
  input: {
    scoreA: number;
    scoreB: number;
    action?: MatchScoreEvent["action"];
    side?: MatchScoreEvent["side"];
    scorerName?: string;
    scorerUserId?: string;
  },
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

  assertTournamentLiveForScoring(tournament);

  if (match.status === "completed" || match.status === "bye") {
    throw new AppError("Match already finished", { code: "CONFLICT", statusCode: 409 });
  }

  if (!match.teamAId || !match.teamBId) {
    throw new AppError("Both teams must be set before live scoring", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const rules = buildScoringRules(tournament);
  let scoreA = Math.max(0, match.scoreA ?? 0);
  let scoreB = Math.max(0, match.scoreB ?? 0);
  const prevMeta = parseBracketMatchMetadata(match.metadata);
  let nextGameState = prevMeta.gameState ?? emptyMatchGameState();
  const useGamesMode = getTournamentMatchScoreMode(tournament) === "games";

  if (useGamesMode && input.action && input.side) {
    const gameRules = getTournamentGameRules(tournament);
    const delta = input.action === "decrement" ? (-1 as const) : (1 as const);
    const applied = applyGamePointDelta(
      scoreA,
      scoreB,
      nextGameState,
      input.side,
      delta,
      gameRules,
    );
    if (!applied) {
      throw new AppError(
        delta > 0
          ? "Cannot award point — game or match may already be complete"
          : "Cannot undo — no points in the current game",
        { code: "VALIDATION_ERROR", statusCode: 422 },
      );
    }
    scoreA = applied.gamesA;
    scoreB = applied.gamesB;
    nextGameState = applied.gameState;
  } else if (input.action === "increment" && input.side) {
    const next = engineApplyDelta(scoreA, scoreB, input.side, 1, rules);
    if (!next) {
      throw new AppError("Cannot increase score — match may be complete or at cap", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    scoreA = next.scoreA;
    scoreB = next.scoreB;
  } else if (input.action === "decrement" && input.side) {
    const next = engineApplyDelta(scoreA, scoreB, input.side, -1, rules);
    if (!next) {
      throw new AppError("Score cannot go below zero", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    scoreA = next.scoreA;
    scoreB = next.scoreB;
  } else {
    scoreA = Math.max(0, Math.min(rules.deuceConfig.maxScore, input.scoreA));
    scoreB = Math.max(0, Math.min(rules.deuceConfig.maxScore, input.scoreB));
    if (useGamesMode) {
      nextGameState = emptyMatchGameState();
    }
  }

  const event = buildMatchScoreEvent(userId, userName, scoreA, scoreB, {
    action: input.action ?? "set",
    side: input.side,
    scorerName: input.scorerName,
    scorerUserId: input.scorerUserId,
  });
  const metadata = appendBracketScoreEvent(
    prevMeta,
    event,
    useGamesMode ? nextGameState : undefined,
  );

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      scoreA,
      scoreB,
      status: "in_progress",
      recordedByUserId: userId,
      metadata,
    })
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update score", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  const playersByTeam = await getBracketTeamPlayers([match.teamAId, match.teamBId]);
  return mapBracketRowToView(updated, playersByTeam);
}

export async function hasBracket(tournamentId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId))
    .limit(1);
  return Boolean(row);
}
