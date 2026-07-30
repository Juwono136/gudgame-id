import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { partnerPlayers } from "@/db/schema/partner-players";
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
  applyGamePointSet,
  emptyMatchGameState,
  reconcileMatchGamesScores,
  startNextGameAfterWin,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";
import {
  applyClassicSetPointDelta,
  startNextClassicAfterWin,
  sumClassicGames,
} from "@/lib/tournaments/scoring/classic-sets";
import {
  getTournamentClassicSetRules,
  getTournamentDeuceConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
  isClassicSetsFormat,
} from "@/lib/tournaments/settings";
import { recordMatchScoreRevision } from "@/lib/tournaments/scoring/score-revisions";
import {
  assertTimedScoreAllowed,
  buildSuddenDeathEndsAt,
  hasSuddenDeathExtended,
} from "@/lib/tournaments/scoring/timed-hard-stop";
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
  playOrder: number | null;
  callStatus: string | null;
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
  const gameState = meta.gameState ?? null;
  const reconciled = reconcileMatchGamesScores(row.scoreA, row.scoreB, gameState);
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
    scoreA: reconciled.scoreA,
    scoreB: reconciled.scoreB,
    winnerTeamId: row.winnerTeamId,
    status: row.status,
    nextMatchId: row.nextMatchId,
    courtId: row.courtId,
    startedAt: row.scheduledAt?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    scoreEvents: meta.scoreEvents ?? [],
    gameState,
    playOrder: row.playOrder ?? null,
    callStatus: row.callStatus ?? "queued",
  };
}

async function getBracketTeamPlayers(teamIds: string[]): Promise<Map<string, string[]>> {
  if (!teamIds.length) return new Map();

  const rows = await getDb()
    .select({
      teamId: tournamentTeamMembers.teamId,
      displayName: sql<string>`coalesce(nullif(${user.nickname}, ''), ${user.name}, ${partnerPlayers.fullName})`,
      slotIndex: tournamentTeamMembers.slotIndex,
    })
    .from(tournamentTeamMembers)
    .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .leftJoin(partnerPlayers, eq(tournamentTeamMembers.partnerPlayerId, partnerPlayers.id))
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

  if (tournament.partnerId) {
    const { syncPartnerMatchResult, syncPartnerTournamentPlacements } = await import(
      "@/lib/partners/stats/sync"
    );
    const totalRounds = await db
      .select({ roundNumber: tournamentBracketMatches.roundNumber })
      .from(tournamentBracketMatches)
      .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
    const maxRound = Math.max(...totalRounds.map((r) => r.roundNumber), 1);
    const { getBracketRoundLabel } = await import("@/lib/tournaments/brackets/round-labels");
    await syncPartnerMatchResult({
      tournament,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      scoreA,
      scoreB,
      round: getBracketRoundLabel(match.roundNumber, maxRound),
    });

    if (isFinal && winnerTeamId) {
      await syncPartnerTournamentPlacements({
        tournament,
        placements: [{ teamId: winnerTeamId, placement: "Champion", placementRank: 1 }],
      });
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
    /** Absolute intra-game points target when action is set_points. */
    targetPoints?: number;
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
  const useGamesMode = getTournamentMatchScoreMode(tournament) === "games";
  const prevMeta = parseBracketMatchMetadata(match.metadata);
  const scoreABefore = Math.max(0, match.scoreA ?? 0);
  const scoreBBefore = Math.max(0, match.scoreB ?? 0);
  let nextTimerEndsAt = match.timerEndsAt ?? null;
  let nextMetaBase: Record<string, unknown> = { ...prevMeta };

  const timedGate = assertTimedScoreAllowed(tournament, {
    timerEndsAt: match.timerEndsAt,
    scoreA: scoreABefore,
    scoreB: scoreBBefore,
    action: input.action,
    suddenDeathExtended: hasSuddenDeathExtended(match.metadata),
  });
  if (timedGate.blocked && timedGate.reason === "expired_tied_extend") {
    nextTimerEndsAt = buildSuddenDeathEndsAt(tournament);
    nextMetaBase = { ...nextMetaBase, suddenDeathExtended: true };
  }

  let nextGameState = prevMeta.gameState ?? emptyMatchGameState();
  const reconciled = reconcileMatchGamesScores(match.scoreA, match.scoreB, nextGameState);
  let scoreA = reconciled.scoreA;
  let scoreB = reconciled.scoreB;
  let eventScoreA = scoreA;
  let eventScoreB = scoreB;

  if (input.action === "next_game") {
    if (!useGamesMode) {
      throw new AppError("next_game is only valid for race-to-N games scoring", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    if (isClassicSetsFormat(tournament)) {
      const setRules = getTournamentClassicSetRules(tournament);
      const advanced = startNextClassicAfterWin(
        scoreA,
        scoreB,
        nextGameState,
        setRules,
      );
      if (!advanced) {
        throw new AppError("No completed game is waiting to advance", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      scoreA = advanced.setsA;
      scoreB = advanced.setsB;
      nextGameState = advanced.gameState;
      eventScoreA = 0;
      eventScoreB = 0;
    } else {
      const started = startNextGameAfterWin(nextGameState);
      if (!started) {
        throw new AppError("No completed game is waiting to advance", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      nextGameState = started;
      eventScoreA = 0;
      eventScoreB = 0;
    }
  } else if (input.action === "increment" || input.action === "decrement") {
    if (!input.side) {
      throw new AppError("Missing scoring side for live point update", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    const delta = input.action === "decrement" ? (-1 as const) : (1 as const);
    if (useGamesMode && isClassicSetsFormat(tournament)) {
      const gameRules = getTournamentGameRules(tournament, "knockout");
      const setRules = getTournamentClassicSetRules(tournament);
      const applied = applyClassicSetPointDelta(
        scoreA,
        scoreB,
        nextGameState,
        input.side,
        delta,
        gameRules,
        setRules,
      );
      if (!applied) {
        throw new AppError(
          delta > 0
            ? nextGameState.pendingGameWinner
              ? "Game finished — tap “Next game” to continue, or undo the last point"
              : "Cannot award point — game, set, or match may already be complete"
            : "Cannot undo — no points available",
          { code: "VALIDATION_ERROR", statusCode: 422 },
        );
      }
      scoreA = applied.setsA;
      scoreB = applied.setsB;
      nextGameState = applied.gameState;
      eventScoreA =
        applied.gameState.phase === "set_tiebreak" ||
        applied.gameState.phase === "super_tiebreak"
          ? (applied.gameState.tbPointsA ?? 0)
          : applied.gameState.currentPointsA;
      eventScoreB =
        applied.gameState.phase === "set_tiebreak" ||
        applied.gameState.phase === "super_tiebreak"
          ? (applied.gameState.tbPointsB ?? 0)
          : applied.gameState.currentPointsB;
    } else if (useGamesMode) {
      const gameRules = getTournamentGameRules(tournament, "knockout");
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
            ? nextGameState.pendingGameWinner
              ? "Game finished — tap “Next game” to continue, or undo the last point"
              : "Cannot award point — game or match may already be complete"
            : "Cannot undo — no points in the current game",
          { code: "VALIDATION_ERROR", statusCode: 422 },
        );
      }
      scoreA = applied.gamesA;
      scoreB = applied.gamesB;
      nextGameState = applied.gameState;
      const synced = reconcileMatchGamesScores(scoreA, scoreB, nextGameState);
      scoreA = synced.scoreA;
      scoreB = synced.scoreB;
      eventScoreA = nextGameState.currentPointsA;
      eventScoreB = nextGameState.currentPointsB;
    } else {
      const next = engineApplyDelta(scoreA, scoreB, input.side, delta, rules);
      if (!next) {
        throw new AppError(
          delta > 0
            ? "Cannot increase score — match may be complete or at cap"
            : "Score cannot go below zero",
          { code: "VALIDATION_ERROR", statusCode: 422 },
        );
      }
      scoreA = next.scoreA;
      scoreB = next.scoreB;
      eventScoreA = scoreA;
      eventScoreB = scoreB;
    }
  } else if (input.action === "set_points") {
    if (!useGamesMode) {
      throw new AppError("set_points is only valid for race-to-N games scoring", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    if (!input.side) {
      throw new AppError("Missing scoring side for set_points", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    const gameRules = getTournamentGameRules(tournament, "knockout");
    const target =
      typeof input.targetPoints === "number"
        ? input.targetPoints
        : input.side === "a"
          ? input.scoreA
          : input.scoreB;
    const applied = applyGamePointSet(
      scoreA,
      scoreB,
      nextGameState,
      input.side,
      target,
      gameRules,
    );
    if (!applied) {
      throw new AppError(
        nextGameState.pendingGameWinner
          ? "Game finished — tap “Next game” to continue, or undo the last point"
          : "Cannot set points to that target",
        { code: "VALIDATION_ERROR", statusCode: 422 },
      );
    }
    scoreA = applied.gamesA;
    scoreB = applied.gamesB;
    nextGameState = applied.gameState;
    const synced = reconcileMatchGamesScores(scoreA, scoreB, nextGameState);
    scoreA = synced.scoreA;
    scoreB = synced.scoreB;
    eventScoreA = nextGameState.currentPointsA;
    eventScoreB = nextGameState.currentPointsB;
  } else if (input.action === "set") {
    scoreA = Math.max(0, Math.min(rules.deuceConfig.maxScore, input.scoreA));
    scoreB = Math.max(0, Math.min(rules.deuceConfig.maxScore, input.scoreB));
    if (useGamesMode) {
      nextGameState = {
        currentPointsA: 0,
        currentPointsB: 0,
        completedGames: nextGameState.completedGames,
        pendingGameWinner: null,
      };
    }
    eventScoreA = useGamesMode ? 0 : scoreA;
    eventScoreB = useGamesMode ? 0 : scoreB;
  } else {
    throw new AppError(
      "action is required (increment, decrement, set, set_points, or next_game)",
      {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      },
    );
  }

  const event = buildMatchScoreEvent(userId, userName, eventScoreA, eventScoreB, {
    action: input.action,
    side: input.action === "next_game" ? undefined : input.side,
    scorerName: input.scorerName,
    scorerUserId: input.scorerUserId,
  });
  const classicExtras = isClassicSetsFormat(tournament)
    ? (() => {
        const totals = sumClassicGames(
          nextGameState.setScores,
          nextGameState.gamesInSetA ?? 0,
          nextGameState.gamesInSetB ?? 0,
        );
        return {
          setsForA: scoreA,
          setsForB: scoreB,
          gamesForA: totals.gamesForA,
          gamesForB: totals.gamesForB,
        };
      })()
    : {};
  const metadata =
    input.action === "decrement"
      ? {
          ...nextMetaBase,
          ...(useGamesMode ? { gameState: nextGameState } : {}),
          ...classicExtras,
        }
      : {
          ...appendBracketScoreEvent(
            nextMetaBase as typeof prevMeta,
            event,
            useGamesMode ? nextGameState : undefined,
          ),
          ...classicExtras,
        };

  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({
      scoreA,
      scoreB,
      status: "in_progress",
      recordedByUserId: userId,
      metadata,
      ...(nextTimerEndsAt && nextTimerEndsAt !== match.timerEndsAt
        ? { timerEndsAt: nextTimerEndsAt }
        : {}),
    })
    .where(eq(tournamentBracketMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update score", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  await recordMatchScoreRevision({
    tournamentId: tournament.id,
    matchKind: "bracket",
    matchId,
    action: input.action ?? "set",
    scoreABefore,
    scoreBBefore,
    scoreAAfter: scoreA,
    scoreBAfter: scoreB,
    side: input.side,
    gameState: useGamesMode ? nextGameState : undefined,
    actorUserId: userId,
    actorName: userName,
  });

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
