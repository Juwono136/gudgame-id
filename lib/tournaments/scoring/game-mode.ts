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
  /** First side to win this many games wins the match (supports custom targets from matchScoring). */
  raceToGames: number;
  /** Points needed to win a game (default 40: through rallies at 15 / 30 / 40). */
  pointsToWinGame: number;
  /**
   * At deuce (both at pointsToWinGame-1):
   * golden_point = No-Ad (sudden death on first deuce);
   * star_point = FIP Star Point (sudden death only on the third deuce in the game);
   * advantage = win by 2.
   */
  gameDecider: "golden_point" | "star_point" | "advantage";
  pointStyle: IntraGamePointStyle;
};

/** Persist decider as-is; star_point is distinct from golden_point (FIP vs No-Ad). */
export function normalizeGameDecider(
  value: string | null | undefined,
): "golden_point" | "star_point" | "advantage" | undefined {
  if (value === "advantage") return "advantage";
  if (value === "golden_point") return "golden_point";
  if (value === "star_point") return "star_point";
  return undefined;
}

export function isStarPointDecider(
  decider: MatchGameRules["gameDecider"] | null | undefined,
): boolean {
  return decider === "star_point";
}

export function isNoAdDecider(
  decider: MatchGameRules["gameDecider"] | null | undefined,
): boolean {
  return decider === "golden_point";
}

export type CompletedGameScore = {
  pointsA: number;
  pointsB: number;
  /** Side that served this completed game. */
  serverSide?: "a" | "b";
  serverUserId?: string | null;
  serverName?: string | null;
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
  /**
   * How many times this game has reached deuce (both ≥ pointsToWinGame-1 and equal).
   * Used for FIP Star Point (sudden death on the 3rd deuce).
   */
  deuceCount?: number;
  /** Side serving the current game (alternates after each game). */
  servingSide?: "a" | "b";
  servingUserId?: string | null;
  servingName?: string | null;
  /** Classic sets (ITF/FIP) — optional; ignored in race-to-N mode. */
  phase?: "game" | "set_tiebreak" | "super_tiebreak";
  gamesInSetA?: number;
  gamesInSetB?: number;
  tbPointsA?: number;
  tbPointsB?: number;
  setScores?: Array<{
    gamesA: number;
    gamesB: number;
    viaTiebreak?: boolean;
    viaSuperTiebreak?: boolean;
  }>;
};

export type ServeSelection = {
  servingSide: "a" | "b";
  servingUserId?: string | null;
  servingName?: string | null;
};

export const FIP_STAR_POINT_DEUCE_THRESHOLD = 3;

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
    deuceCount: 0,
    servingSide: "a",
    servingUserId: null,
    servingName: null,
  };
}

/** Update who serves the current game (does not change points). */
export function withCurrentServer(
  gameState: MatchGameState,
  serve: ServeSelection,
): MatchGameState {
  return {
    ...gameState,
    servingSide: serve.servingSide,
    servingUserId: serve.servingUserId ?? null,
    servingName: serve.servingName?.trim() || null,
  };
}

/** Flip serve to the opposite side after a completed game. */
export function flipServingSide(gameState: MatchGameState): MatchGameState {
  const nextSide: "a" | "b" = (gameState.servingSide ?? "a") === "a" ? "b" : "a";
  return {
    ...gameState,
    servingSide: nextSide,
    servingUserId: null,
    servingName: null,
  };
}

function stampCompletedGame(
  pointsA: number,
  pointsB: number,
  gameState: MatchGameState,
): CompletedGameScore {
  return {
    pointsA,
    pointsB,
    serverSide: gameState.servingSide ?? "a",
    serverUserId: gameState.servingUserId ?? null,
    serverName: gameState.servingName ?? null,
  };
}

export type ServeHistoryEntry = {
  gameNumber: number;
  serverSide: "a" | "b";
  displayName: string;
};

/** Build serve history from completed games (preferred over point-scorer logs). */
export function serveHistoryFromCompletedGames(
  completedGames: CompletedGameScore[],
): ServeHistoryEntry[] {
  return completedGames.map((game, index) => ({
    gameNumber: index + 1,
    serverSide: game.serverSide === "b" ? "b" : "a",
    displayName: game.serverName?.trim() || (game.serverSide === "b" ? "Team B" : "Team A"),
  }));
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
        .map((g) => {
          const serverSide =
            g.serverSide === "a" || g.serverSide === "b" ? g.serverSide : undefined;
          const serverName =
            typeof g.serverName === "string" && g.serverName.trim()
              ? g.serverName.trim()
              : null;
          const serverUserId =
            typeof g.serverUserId === "string" && g.serverUserId.trim()
              ? g.serverUserId.trim()
              : null;
          return {
            pointsA: Math.floor(g.pointsA),
            pointsB: Math.floor(g.pointsB),
            ...(serverSide ? { serverSide } : {}),
            ...(serverName != null ? { serverName } : {}),
            ...(serverUserId != null ? { serverUserId } : {}),
          };
        })
    : [];
  const pendingRaw = v.pendingGameWinner;
  const pendingGameWinner =
    pendingRaw === "a" || pendingRaw === "b" ? pendingRaw : null;
  const deuceCount =
    typeof v.deuceCount === "number" && v.deuceCount >= 0
      ? Math.floor(v.deuceCount)
      : 0;
  const servingSide =
    v.servingSide === "a" || v.servingSide === "b" ? v.servingSide : "a";
  const servingName =
    typeof v.servingName === "string" && v.servingName.trim()
      ? v.servingName.trim()
      : null;
  const servingUserId =
    typeof v.servingUserId === "string" && v.servingUserId.trim()
      ? v.servingUserId.trim()
      : null;

  // Preserve optional classic-sets fields (ITF/FIP) without requiring callers to
  // use a separate parser — otherwise phase / games-in-set / TB are lost on read.
  const phase =
    v.phase === "game" || v.phase === "set_tiebreak" || v.phase === "super_tiebreak"
      ? v.phase
      : undefined;
  const numOrUndef = (key: string) =>
    typeof v[key] === "number" && Number.isFinite(v[key]) && (v[key] as number) >= 0
      ? Math.floor(v[key] as number)
      : undefined;
  const setScores = Array.isArray(v.setScores)
    ? v.setScores
        .filter(
          (s): s is { gamesA: number; gamesB: number } =>
            !!s &&
            typeof s === "object" &&
            typeof (s as { gamesA?: unknown }).gamesA === "number" &&
            typeof (s as { gamesB?: unknown }).gamesB === "number",
        )
        .map((s) => ({
          gamesA: Math.floor(s.gamesA),
          gamesB: Math.floor(s.gamesB),
          viaTiebreak: Boolean((s as { viaTiebreak?: unknown }).viaTiebreak),
          viaSuperTiebreak: Boolean((s as { viaSuperTiebreak?: unknown }).viaSuperTiebreak),
        }))
    : undefined;

  return {
    currentPointsA,
    currentPointsB,
    completedGames,
    pendingGameWinner,
    deuceCount,
    servingSide,
    servingUserId,
    servingName,
    ...(phase ? { phase } : {}),
    ...(numOrUndef("gamesInSetA") != null ? { gamesInSetA: numOrUndef("gamesInSetA") } : {}),
    ...(numOrUndef("gamesInSetB") != null ? { gamesInSetB: numOrUndef("gamesInSetB") } : {}),
    ...(numOrUndef("tbPointsA") != null ? { tbPointsA: numOrUndef("tbPointsA") } : {}),
    ...(numOrUndef("tbPointsB") != null ? { tbPointsB: numOrUndef("tbPointsB") } : {}),
    ...(setScores ? { setScores } : {}),
  };
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
  deuceCount = 0,
): GameCompletion {
  const need = rules.pointsToWinGame;
  const max = Math.max(pointsA, pointsB);
  const min = Math.min(pointsA, pointsB);
  const leader: "a" | "b" = pointsA > pointsB ? "a" : "b";

  if (pointsA === pointsB) return { complete: false, winner: null };

  // Reached game target before opponent reached deuce threshold.
  if (max >= need && min < need - 1) {
    return { complete: true, winner: leader };
  }

  // Golden Point / No-Ad: first deuce → next point wins.
  if (isNoAdDecider(rules.gameDecider)) {
    if (min >= need - 1 && max > min) {
      return { complete: true, winner: leader };
    }
    return { complete: false, winner: null };
  }

  // FIP Star Point: advantage until the 3rd deuce, then next point wins.
  if (isStarPointDecider(rules.gameDecider)) {
    if (deuceCount >= FIP_STAR_POINT_DEUCE_THRESHOLD && min >= need - 1 && max > min) {
      return { complete: true, winner: leader };
    }
    if (deuceCount < FIP_STAR_POINT_DEUCE_THRESHOLD && max >= need && max - min >= 2) {
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
  const min = Math.min(gamesA, gamesB);
  // First-to-N: winner must land exactly on the race target (no inflated tallies).
  if (max !== rules.raceToGames) return { complete: false, winner: null };
  if (min >= rules.raceToGames) return { complete: false, winner: null };
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
  let deuceCount = gameState.deuceCount ?? 0;
  const need = rules.pointsToWinGame;

  const wasAtDeuce =
    pointsA === pointsB && pointsA >= need - 1 && pointsB >= need - 1;

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
          ...gameState,
          currentPointsA: pointsA,
          currentPointsB: pointsB,
          completedGames,
          pendingGameWinner: null,
          deuceCount: Math.max(0, deuceCount),
          servingSide: last.serverSide ?? gameState.servingSide ?? "a",
          servingUserId: last.serverUserId ?? gameState.servingUserId ?? null,
          servingName: last.serverName ?? gameState.servingName ?? null,
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
    const nowAtDeuce =
      pointsA === pointsB && pointsA >= need - 1 && pointsB >= need - 1;
    // Leaving a deuce state undoes the last deuce visit.
    if (wasAtDeuce && !nowAtDeuce) {
      deuceCount = Math.max(0, deuceCount - 1);
    }
    return {
      gamesA,
      gamesB,
      gameState: {
        ...gameState,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        pendingGameWinner: null,
        deuceCount,
      },
      gameJustWon: null,
      matchComplete: matchDone.complete,
      matchWinner: matchDone.winner,
    };
  }

  if (side === "a") pointsA += 1;
  else pointsB += 1;

  const nowAtDeuce =
    pointsA === pointsB && pointsA >= need - 1 && pointsB >= need - 1;
  if (nowAtDeuce && !wasAtDeuce) {
    deuceCount += 1;
  }

  const gameDone = isGamePointComplete(pointsA, pointsB, rules, deuceCount);
  if (!gameDone.complete || !gameDone.winner) {
    return {
      gamesA,
      gamesB,
      gameState: {
        ...gameState,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        pendingGameWinner: null,
        deuceCount,
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
      ...gameState,
      currentPointsA: pointsA,
      currentPointsB: pointsB,
      completedGames: [...completedGames, stampCompletedGame(pointsA, pointsB, gameState)],
      pendingGameWinner: gameDone.winner,
      deuceCount,
    },
    gameJustWon: gameDone.winner,
    matchComplete: nextMatch.complete,
    matchWinner: nextMatch.winner,
  };
}

/**
 * Jump the selected side's intra-game points to an absolute target (e.g. 15 / 30 / 40).
 * Same completion rules as {@link applyGamePointDelta}; blocked while a game is held.
 */
export function applyGamePointSet(
  gamesA: number,
  gamesB: number,
  gameState: MatchGameState,
  side: "a" | "b",
  targetPoints: number,
  rules: MatchGameRules,
): GameScoreApplyResult | null {
  const matchDone = isRaceToGamesMatchComplete(gamesA, gamesB, rules);
  if (gameState.pendingGameWinner) return null;
  if (matchDone.complete) return null;

  const target = Math.max(0, Math.min(Math.floor(targetPoints), rules.pointsToWinGame));
  let pointsA = gameState.currentPointsA;
  let pointsB = gameState.currentPointsB;

  if (side === "a") {
    if (pointsA === target) return null;
    pointsA = target;
  } else {
    if (pointsB === target) return null;
    pointsB = target;
  }

  const gameDone = isGamePointComplete(
    pointsA,
    pointsB,
    rules,
    gameState.deuceCount ?? 0,
  );
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

  const nextGamesA = gamesA + (gameDone.winner === "a" ? 1 : 0);
  const nextGamesB = gamesB + (gameDone.winner === "b" ? 1 : 0);
  const nextMatch = isRaceToGamesMatchComplete(nextGamesA, nextGamesB, rules);

  return {
    gamesA: nextGamesA,
    gamesB: nextGamesB,
    gameState: {
      ...gameState,
      currentPointsA: pointsA,
      currentPointsB: pointsB,
      completedGames: [
        ...gameState.completedGames,
        stampCompletedGame(pointsA, pointsB, gameState),
      ],
      pendingGameWinner: gameDone.winner,
      deuceCount: gameState.deuceCount ?? 0,
    },
    gameJustWon: gameDone.winner,
    matchComplete: nextMatch.complete,
    matchWinner: nextMatch.winner,
  };
}

/**
 * After a game win is held at the finishing score (e.g. 40–x), reset points to 0–0
 * for the next game and flip serve to the other side. No-op if nothing is pending.
 */
export function startNextGameAfterWin(
  gameState: MatchGameState,
): MatchGameState | null {
  if (!gameState.pendingGameWinner) return null;
  return flipServingSide({
    ...gameState,
    currentPointsA: 0,
    currentPointsB: 0,
    completedGames: gameState.completedGames,
    pendingGameWinner: null,
    deuceCount: 0,
  });
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
