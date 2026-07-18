/**
 * Race-to-N games match scoring.
 *
 * Public scoreA/scoreB = games won in the match (first to raceToGames).
 * Intra-game points live in MatchGameState and always increment by 1:
 *   0 → 1 → 2 → … → 15 (rally 1) → … → 30 (rally 2) → … → 40 (rally 3 / game won).
 * Reaching pointsToWinGame (default 40) awards 1 game toward Race to N.
 */

export const RACE_TO_GAMES_OPTIONS = [2, 3, 4, 6] as const;
export type RaceToGames = (typeof RACE_TO_GAMES_OPTIONS)[number];

/** Common race-to targets for racket-style sports (group stage). */
export const RACE_TO_GAMES_COMMON_OPTIONS = [4, 6] as const;

export const MATCH_SCORE_MODES = ["points", "games"] as const;
export type MatchScoreMode = (typeof MATCH_SCORE_MODES)[number];

/**
 * How points within a game are displayed.
 * Prefer "simple" (0,1,2,…40) — tennis labels confuse operators.
 */
export type IntraGamePointStyle = "tennis" | "simple";

/** Rally checkpoints within a game (first to 40). */
export const GAME_RALLY_MILESTONES = [15, 30, 40] as const;

export type MatchGameRules = {
  raceToGames: RaceToGames;
  /** Points needed to win a game (default 40: through rallies at 15 / 30 / 40). */
  pointsToWinGame: number;
  /** At deuce (both at pointsToWinGame-1): golden_point = next point wins; advantage = win by 2. */
  gameDecider: "golden_point" | "advantage";
  pointStyle: IntraGamePointStyle;
};

export type CompletedGameScore = {
  pointsA: number;
  pointsB: number;
};

export type MatchGameState = {
  currentPointsA: number;
  currentPointsB: number;
  completedGames: CompletedGameScore[];
  /**
   * When set, the current game is already won (points held at the winning total,
   * e.g. 40) until the operator confirms the next game / reset.
   */
  pendingGameWinner?: "a" | "b" | null;
};

export const DEFAULT_GAME_RULES_BY_UNIT: Record<
  "games" | "sets",
  MatchGameRules
> = {
  games: {
    raceToGames: 4,
    pointsToWinGame: 40,
    // First-to-N: at 39–39 the next +1 wins. No tennis-style deuce UI needed.
    gameDecider: "golden_point",
    pointStyle: "simple",
  },
  sets: {
    raceToGames: 2,
    pointsToWinGame: 40,
    gameDecider: "golden_point",
    pointStyle: "simple",
  },
};

export function emptyMatchGameState(): MatchGameState {
  return {
    currentPointsA: 0,
    currentPointsB: 0,
    completedGames: [],
    pendingGameWinner: null,
  };
}

export function parseMatchGameState(raw: unknown): MatchGameState | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const currentPointsA =
    typeof v.currentPointsA === "number" && v.currentPointsA >= 0
      ? Math.floor(v.currentPointsA)
      : 0;
  const currentPointsB =
    typeof v.currentPointsB === "number" && v.currentPointsB >= 0
      ? Math.floor(v.currentPointsB)
      : 0;
  const completedGames = Array.isArray(v.completedGames)
    ? v.completedGames
        .filter(
          (g): g is CompletedGameScore =>
            !!g &&
            typeof g === "object" &&
            typeof (g as CompletedGameScore).pointsA === "number" &&
            typeof (g as CompletedGameScore).pointsB === "number",
        )
        .map((g) => ({
          pointsA: Math.floor(g.pointsA),
          pointsB: Math.floor(g.pointsB),
        }))
    : [];
  const pendingRaw = v.pendingGameWinner;
  const pendingGameWinner =
    pendingRaw === "a" || pendingRaw === "b" ? pendingRaw : null;
  return { currentPointsA, currentPointsB, completedGames, pendingGameWinner };
}

/** Display label for a point total (simple = raw count; tennis kept for legacy data only). */
export function formatIntraGamePoint(
  points: number,
  style: IntraGamePointStyle = "simple",
): string {
  if (style === "simple") return String(Math.max(0, points));
  if (points <= 0) return "0";
  if (points === 1) return "15";
  if (points === 2) return "30";
  if (points === 3) return "40";
  return "Ad";
}

export function formatIntraGameScoreLine(
  pointsA: number,
  pointsB: number,
  style: IntraGamePointStyle = "simple",
): string {
  if (style === "tennis" && pointsA >= 3 && pointsB >= 3) {
    if (pointsA === pointsB) return "40 – 40";
    if (pointsA > pointsB) return "Ad – 40";
    return "40 – Ad";
  }
  return `${formatIntraGamePoint(pointsA, style)} – ${formatIntraGamePoint(pointsB, style)}`;
}

/** How many rally milestones (15 / 30 / 40) this side has already cleared. */
export function countCompletedRallies(
  points: number,
  milestones: readonly number[] = GAME_RALLY_MILESTONES,
): number {
  let n = 0;
  for (const m of milestones) {
    if (points >= m) n += 1;
    else break;
  }
  return n;
}

/** Next rally target (15, 30, or 40). Null when game target already reached. */
export function nextRallyTarget(
  points: number,
  milestones: readonly number[] = GAME_RALLY_MILESTONES,
): number | null {
  for (const m of milestones) {
    if (points < m) return m;
  }
  return null;
}

export type GameCompletion = {
  complete: boolean;
  winner: "a" | "b" | null;
};

export function isGamePointComplete(
  pointsA: number,
  pointsB: number,
  rules: MatchGameRules,
): GameCompletion {
  const need = rules.pointsToWinGame;
  const max = Math.max(pointsA, pointsB);
  const min = Math.min(pointsA, pointsB);
  const leader: "a" | "b" = pointsA > pointsB ? "a" : "b";

  if (pointsA === pointsB) return { complete: false, winner: null };

  if (rules.gameDecider === "golden_point") {
    // First to need, or sudden death once both reach need-1.
    if (max >= need && min < need - 1) {
      return { complete: true, winner: leader };
    }
    if (min >= need - 1 && max > min) {
      return { complete: true, winner: leader };
    }
    return { complete: false, winner: null };
  }

  // Advantage (win by 2 once at threshold).
  if (max >= need && max - min >= 2) {
    return { complete: true, winner: leader };
  }
  return { complete: false, winner: null };
}

export function isRaceToGamesMatchComplete(
  gamesA: number,
  gamesB: number,
  rules: MatchGameRules,
): GameCompletion {
  if (gamesA === gamesB) return { complete: false, winner: null };
  const max = Math.max(gamesA, gamesB);
  if (max < rules.raceToGames) return { complete: false, winner: null };
  return { complete: true, winner: gamesA > gamesB ? "a" : "b" };
}

export type GameScoreApplyResult = {
  gamesA: number;
  gamesB: number;
  gameState: MatchGameState;
  gameJustWon: "a" | "b" | null;
  matchComplete: boolean;
  matchWinner: "a" | "b" | null;
};

/**
 * Apply +1 / -1 to the current game's points (always ±1).
 * When a game completes, games won increase but points are held (e.g. at 40)
 * until {@link startNextGameAfterWin} resets them.
 */
export function applyGamePointDelta(
  gamesA: number,
  gamesB: number,
  gameState: MatchGameState,
  side: "a" | "b",
  delta: 1 | -1,
  rules: MatchGameRules,
): GameScoreApplyResult | null {
  const matchDone = isRaceToGamesMatchComplete(gamesA, gamesB, rules);
  const pending = gameState.pendingGameWinner ?? null;

  // While a finished game is held on screen, only undo is allowed (not more +).
  if (pending && delta > 0) return null;
  if (matchDone.complete && delta > 0 && !pending) return null;

  let pointsA = gameState.currentPointsA;
  let pointsB = gameState.currentPointsB;
  let nextGamesA = gamesA;
  let nextGamesB = gamesB;
  let completedGames = gameState.completedGames;

  if (delta < 0) {
    if (pending) {
      // Undo the held game win: remove last completed game + revert games won.
      if (side !== pending) return null;
      const last = completedGames[completedGames.length - 1];
      if (!last) return null;
      if (side === "a") {
        if (pointsA <= 0) return null;
        pointsA -= 1;
        nextGamesA = Math.max(0, gamesA - 1);
      } else {
        if (pointsB <= 0) return null;
        pointsB -= 1;
        nextGamesB = Math.max(0, gamesB - 1);
      }
      completedGames = completedGames.slice(0, -1);
      const afterUndo = isRaceToGamesMatchComplete(nextGamesA, nextGamesB, rules);
      return {
        gamesA: nextGamesA,
        gamesB: nextGamesB,
        gameState: {
          currentPointsA: pointsA,
          currentPointsB: pointsB,
          completedGames,
          pendingGameWinner: null,
        },
        gameJustWon: null,
        matchComplete: afterUndo.complete,
        matchWinner: afterUndo.winner,
      };
    }

    if (side === "a") {
      if (pointsA <= 0) return null;
      pointsA -= 1;
    } else {
      if (pointsB <= 0) return null;
      pointsB -= 1;
    }
    return {
      gamesA,
      gamesB,
      gameState: {
        ...gameState,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        pendingGameWinner: null,
      },
      gameJustWon: null,
      matchComplete: matchDone.complete,
      matchWinner: matchDone.winner,
    };
  }

  if (side === "a") pointsA += 1;
  else pointsB += 1;

  const gameDone = isGamePointComplete(pointsA, pointsB, rules);
  if (!gameDone.complete || !gameDone.winner) {
    return {
      gamesA,
      gamesB,
      gameState: {
        ...gameState,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        pendingGameWinner: null,
      },
      gameJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  nextGamesA = gamesA + (gameDone.winner === "a" ? 1 : 0);
  nextGamesB = gamesB + (gameDone.winner === "b" ? 1 : 0);
  const nextMatch = isRaceToGamesMatchComplete(nextGamesA, nextGamesB, rules);

  return {
    gamesA: nextGamesA,
    gamesB: nextGamesB,
    gameState: {
      // Hold winning totals on screen until operator starts the next game.
      currentPointsA: pointsA,
      currentPointsB: pointsB,
      completedGames: [...completedGames, { pointsA, pointsB }],
      pendingGameWinner: gameDone.winner,
    },
    gameJustWon: gameDone.winner,
    matchComplete: nextMatch.complete,
    matchWinner: nextMatch.winner,
  };
}

/**
 * After a game win is held at the finishing score (e.g. 40–x), reset points to 0–0
 * for the next game. No-op if nothing is pending.
 */
export function startNextGameAfterWin(
  gameState: MatchGameState,
): MatchGameState | null {
  if (!gameState.pendingGameWinner) return null;
  return {
    currentPointsA: 0,
    currentPointsB: 0,
    completedGames: gameState.completedGames,
    pendingGameWinner: null,
  };
}

export function formatRaceToGamesLabel(raceTo: number): string {
  return `Race to ${raceTo}`;
}

export function formatMatchGamesScore(gamesA: number, gamesB: number): string {
  return `${gamesA}–${gamesB}`;
}

/** Count games won from completed rally records (source of truth when columns drift). */
export function gamesWonFromCompleted(
  completedGames: CompletedGameScore[],
): { gamesA: number; gamesB: number } {
  let gamesA = 0;
  let gamesB = 0;
  for (const g of completedGames) {
    if (g.pointsA === g.pointsB) continue;
    if (g.pointsA > g.pointsB) gamesA += 1;
    else gamesB += 1;
  }
  return { gamesA, gamesB };
}

/**
 * Prefer completedGames tally when present so UI never shows Games=0 after a won game
 * while rally state already reset to 0–0.
 */
export function reconcileMatchGamesScores(
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
  gameState: MatchGameState | null | undefined,
): { scoreA: number; scoreB: number } {
  const fallbackA = Math.max(0, scoreA ?? 0);
  const fallbackB = Math.max(0, scoreB ?? 0);
  if (!gameState?.completedGames.length) {
    return { scoreA: fallbackA, scoreB: fallbackB };
  }
  const fromGames = gamesWonFromCompleted(gameState.completedGames);
  return {
    scoreA: Math.max(fallbackA, fromGames.gamesA),
    scoreB: Math.max(fallbackB, fromGames.gamesB),
  };
}
