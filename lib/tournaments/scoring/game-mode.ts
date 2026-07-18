/**
 * Race-to-N games match scoring (padel/tennis-style and adaptable to other sports).
 *
 * Public scoreA/scoreB = games won in the match.
 * Intra-game rally points live in MatchGameState (metadata).
 *
 * Point display for racket sports: 0 → 0, 1 → 15, 2 → 30, 3 → 40.
 * A game is won by reaching pointsToWinGame with lead (or golden point at deuce).
 */

export const RACE_TO_GAMES_OPTIONS = [2, 3, 4, 6] as const;
export type RaceToGames = (typeof RACE_TO_GAMES_OPTIONS)[number];

/** Common race-to targets for racket-style sports (group stage). */
export const RACE_TO_GAMES_COMMON_OPTIONS = [4, 6] as const;

export const MATCH_SCORE_MODES = ["points", "games"] as const;
export type MatchScoreMode = (typeof MATCH_SCORE_MODES)[number];

/** How points within a game are displayed / counted. */
export type IntraGamePointStyle = "tennis" | "simple";

export type MatchGameRules = {
  raceToGames: RaceToGames;
  /** Points needed to win a game (tennis-style default: 4 → Love/15/30/40/game). */
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
};

export const DEFAULT_GAME_RULES_BY_UNIT: Record<
  "games" | "sets",
  MatchGameRules
> = {
  games: {
    raceToGames: 4,
    pointsToWinGame: 4,
    gameDecider: "golden_point",
    pointStyle: "tennis",
  },
  sets: {
    raceToGames: 2,
    pointsToWinGame: 6,
    gameDecider: "advantage",
    pointStyle: "tennis",
  },
};

export function emptyMatchGameState(): MatchGameState {
  return {
    currentPointsA: 0,
    currentPointsB: 0,
    completedGames: [],
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
  return { currentPointsA, currentPointsB, completedGames };
}

/** Tennis-style rally labels for racket sports. */
export function formatIntraGamePoint(
  points: number,
  style: IntraGamePointStyle = "tennis",
): string {
  if (style === "simple") return String(Math.max(0, points));
  if (points <= 0) return "0";
  if (points === 1) return "15";
  if (points === 2) return "30";
  if (points === 3) return "40";
  // Advantage / extra points beyond 40
  return "Ad";
}

export function formatIntraGameScoreLine(
  pointsA: number,
  pointsB: number,
  style: IntraGamePointStyle = "tennis",
): string {
  if (style === "tennis" && pointsA >= 3 && pointsB >= 3) {
    if (pointsA === pointsB) return "40 – 40";
    if (pointsA > pointsB) return "Ad – 40";
    return "40 – Ad";
  }
  return `${formatIntraGamePoint(pointsA, style)} – ${formatIntraGamePoint(pointsB, style)}`;
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
 * Apply +1 / -1 to the current game's rally points.
 * When a game completes on increment, gamesA/gamesB increase and rally resets.
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
  if (matchDone.complete && delta > 0) return null;

  let pointsA = gameState.currentPointsA;
  let pointsB = gameState.currentPointsB;

  if (delta < 0) {
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
      },
      gameJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  const nextGamesA = gamesA + (gameDone.winner === "a" ? 1 : 0);
  const nextGamesB = gamesB + (gameDone.winner === "b" ? 1 : 0);
  const nextMatch = isRaceToGamesMatchComplete(nextGamesA, nextGamesB, rules);

  return {
    gamesA: nextGamesA,
    gamesB: nextGamesB,
    gameState: {
      currentPointsA: 0,
      currentPointsB: 0,
      completedGames: [
        ...gameState.completedGames,
        { pointsA, pointsB },
      ],
    },
    gameJustWon: gameDone.winner,
    matchComplete: nextMatch.complete,
    matchWinner: nextMatch.winner,
  };
}

export function formatRaceToGamesLabel(raceTo: number): string {
  return `Race to ${raceTo}`;
}

export function formatMatchGamesScore(gamesA: number, gamesB: number): string {
  return `${gamesA}–${gamesB}`;
}
