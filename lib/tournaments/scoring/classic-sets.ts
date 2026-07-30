/**
 * ITF / FIP classic set-match scoring (partner tennis & padel).
 *
 * Tennis (ITF): best of 3/5 sets; set to 6 games win-by-2; at 6–6 set tiebreak to 7 win-by-2.
 * Padel (FIP): same scoring as tennis; when sets are 1–1 in best of 3, deciding set is a
 *   super tiebreak to 10 (win-by-2) instead of a full third set.
 *
 * Race-to-N games remains available separately for shortened community formats.
 */

import type { MatchGameRules, MatchGameState } from "@/lib/tournaments/scoring/game-mode";
import {
  emptyMatchGameState,
  isGamePointComplete,
} from "@/lib/tournaments/scoring/game-mode";

export const MATCH_FORMATS = ["race_to_games", "classic_sets"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export type DecidingSetMode = "full_set" | "super_tiebreak";

export type ClassicSetRules = {
  bestOfSets: 1 | 3 | 5;
  gamesToWinSet: number;
  setWinBy: number;
  setTiebreakAt: number;
  setTiebreakTo: number;
  setTiebreakWinBy: number;
  decidingSetMode: DecidingSetMode;
  superTiebreakTo: number;
  superTiebreakWinBy: number;
  /** Short-set walkover score per set (ITF: 6-0; short formats may use 4-0). */
  walkoverGamesPerSet: number;
};

export type SetScoreLine = {
  gamesA: number;
  gamesB: number;
  viaTiebreak?: boolean;
  viaSuperTiebreak?: boolean;
};

export type ClassicSetPhase = "game" | "set_tiebreak" | "super_tiebreak";

/** Extend MatchGameState with optional classic-set fields (backward compatible). */
export type ClassicMatchGameState = MatchGameState & {
  phase?: ClassicSetPhase;
  gamesInSetA?: number;
  gamesInSetB?: number;
  tbPointsA?: number;
  tbPointsB?: number;
  setScores?: SetScoreLine[];
};

export const DEFAULT_ITF_TENNIS_SETS: ClassicSetRules = {
  bestOfSets: 3,
  gamesToWinSet: 6,
  setWinBy: 2,
  setTiebreakAt: 6,
  setTiebreakTo: 7,
  setTiebreakWinBy: 2,
  decidingSetMode: "full_set",
  superTiebreakTo: 10,
  superTiebreakWinBy: 2,
  walkoverGamesPerSet: 6,
};

/** FIP padel: tennis scoring + STB to 10 when sets tied 1–1 in best of 3. */
export const DEFAULT_FIP_PADEL_SETS: ClassicSetRules = {
  ...DEFAULT_ITF_TENNIS_SETS,
  decidingSetMode: "super_tiebreak",
  superTiebreakTo: 10,
  superTiebreakWinBy: 2,
};

export function setsNeededToWinMatch(bestOf: 1 | 3 | 5): number {
  return Math.ceil(bestOf / 2);
}

export function emptyClassicMatchGameState(): ClassicMatchGameState {
  return {
    ...emptyMatchGameState(),
    phase: "game",
    gamesInSetA: 0,
    gamesInSetB: 0,
    tbPointsA: 0,
    tbPointsB: 0,
    setScores: [],
  };
}

export function parseClassicSetRules(raw: unknown): ClassicSetRules | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const bestOf = v.bestOfSets;
  if (bestOf !== 1 && bestOf !== 3 && bestOf !== 5) return null;
  const num = (key: string, fallback: number) =>
    typeof v[key] === "number" && Number.isFinite(v[key]) ? (v[key] as number) : fallback;
  const deciding =
    v.decidingSetMode === "super_tiebreak" || v.decidingSetMode === "full_set"
      ? v.decidingSetMode
      : "full_set";
  return {
    bestOfSets: bestOf,
    gamesToWinSet: num("gamesToWinSet", 6),
    setWinBy: num("setWinBy", 2),
    setTiebreakAt: num("setTiebreakAt", 6),
    setTiebreakTo: num("setTiebreakTo", 7),
    setTiebreakWinBy: num("setTiebreakWinBy", 2),
    decidingSetMode: deciding,
    superTiebreakTo: num("superTiebreakTo", 10),
    superTiebreakWinBy: num("superTiebreakWinBy", 2),
    walkoverGamesPerSet: num("walkoverGamesPerSet", 6),
  };
}

export function classicDefaultsForSport(sportSlug: string): ClassicSetRules {
  const s = sportSlug.toLowerCase();
  if (s === "padel") return { ...DEFAULT_FIP_PADEL_SETS };
  return { ...DEFAULT_ITF_TENNIS_SETS };
}

/** Aggregate games won from completed set lines (+ optional open set). */
export function sumClassicGames(
  setScores: SetScoreLine[] | undefined,
  openGamesA = 0,
  openGamesB = 0,
): { gamesForA: number; gamesForB: number } {
  let gamesForA = openGamesA;
  let gamesForB = openGamesB;
  for (const s of setScores ?? []) {
    gamesForA += s.gamesA;
    gamesForB += s.gamesB;
  }
  return { gamesForA, gamesForB };
}

/** Extract standing stats from match metadata (WO/RET or live classic). */
export function classicStatsFromMatchMeta(
  meta: Record<string, unknown> | null | undefined,
  scoreA: number,
  scoreB: number,
): { setsA: number; setsB: number; gamesA: number; gamesB: number } {
  const setsA =
    typeof meta?.setsForA === "number" ? meta.setsForA : scoreA;
  const setsB =
    typeof meta?.setsForB === "number" ? meta.setsForB : scoreB;
  if (typeof meta?.gamesForA === "number" && typeof meta?.gamesForB === "number") {
    return { setsA, setsB, gamesA: meta.gamesForA, gamesB: meta.gamesForB };
  }
  const gs = meta?.gameState as ClassicMatchGameState | undefined;
  const totals = sumClassicGames(
    gs?.setScores,
    gs?.gamesInSetA ?? 0,
    gs?.gamesInSetB ?? 0,
  );
  // Prefer setScores totals; if none, fall back to score columns only when not classic.
  if ((gs?.setScores?.length ?? 0) > 0 || typeof gs?.gamesInSetA === "number") {
    return { setsA, setsB, gamesA: totals.gamesForA, gamesB: totals.gamesForB };
  }
  return { setsA, setsB, gamesA: scoreA, gamesB: scoreB };
}

export function isSetComplete(
  gamesA: number,
  gamesB: number,
  rules: ClassicSetRules,
): { complete: boolean; winner: "a" | "b" | null; needsTiebreak: boolean } {
  const need = rules.gamesToWinSet;
  const winBy = rules.setWinBy;
  const tbAt = rules.setTiebreakAt;
  if (gamesA === tbAt && gamesB === tbAt) {
    return { complete: false, winner: null, needsTiebreak: true };
  }
  const max = Math.max(gamesA, gamesB);
  const min = Math.min(gamesA, gamesB);
  if (max >= need && max - min >= winBy) {
    return { complete: true, winner: gamesA > gamesB ? "a" : "b", needsTiebreak: false };
  }
  return { complete: false, winner: null, needsTiebreak: false };
}

export function isTiebreakComplete(
  pointsA: number,
  pointsB: number,
  to: number,
  winBy: number,
): { complete: boolean; winner: "a" | "b" | null } {
  if (pointsA === pointsB) return { complete: false, winner: null };
  const max = Math.max(pointsA, pointsB);
  const min = Math.min(pointsA, pointsB);
  if (max >= to && max - min >= winBy) {
    return { complete: true, winner: pointsA > pointsB ? "a" : "b" };
  }
  return { complete: false, winner: null };
}

export function isClassicMatchComplete(
  setsA: number,
  setsB: number,
  rules: ClassicSetRules,
): { complete: boolean; winner: "a" | "b" | null } {
  const need = setsNeededToWinMatch(rules.bestOfSets);
  if (setsA >= need) return { complete: true, winner: "a" };
  if (setsB >= need) return { complete: true, winner: "b" };
  return { complete: false, winner: null };
}

function shouldUseSuperTiebreak(
  setsA: number,
  setsB: number,
  rules: ClassicSetRules,
): boolean {
  if (rules.decidingSetMode !== "super_tiebreak") return false;
  const need = setsNeededToWinMatch(rules.bestOfSets);
  // Best of 3: sets 1–1 → STB. Best of 5: sets 2–2 → STB when configured.
  return setsA === need - 1 && setsB === need - 1;
}

export type ClassicScoreApplyResult = {
  setsA: number;
  setsB: number;
  gameState: ClassicMatchGameState;
  gameJustWon: "a" | "b" | null;
  setJustWon: "a" | "b" | null;
  matchComplete: boolean;
  matchWinner: "a" | "b" | null;
};

function normalizeState(state: ClassicMatchGameState): ClassicMatchGameState {
  return {
    ...emptyClassicMatchGameState(),
    ...state,
    phase: state.phase ?? "game",
    gamesInSetA: state.gamesInSetA ?? 0,
    gamesInSetB: state.gamesInSetB ?? 0,
    tbPointsA: state.tbPointsA ?? 0,
    tbPointsB: state.tbPointsB ?? 0,
    setScores: state.setScores ?? [],
    deuceCount: state.deuceCount ?? 0,
  };
}

/**
 * Apply ±1 point in classic ITF/FIP mode.
 * `setsA`/`setsB` are match sets won (public score columns).
 */
export function applyClassicSetPointDelta(
  setsA: number,
  setsB: number,
  gameState: ClassicMatchGameState,
  side: "a" | "b",
  delta: 1 | -1,
  gameRules: MatchGameRules,
  setRules: ClassicSetRules,
): ClassicScoreApplyResult | null {
  const state = normalizeState(gameState);
  const matchDone = isClassicMatchComplete(setsA, setsB, setRules);
  const pending = state.pendingGameWinner ?? null;

  if (pending && delta > 0) return null;
  if (matchDone.complete && delta > 0 && !pending) return null;

  // --- Super tiebreak / set tiebreak phases ---
  if (state.phase === "set_tiebreak" || state.phase === "super_tiebreak") {
    return applyTbPoint(setsA, setsB, state, side, delta, setRules);
  }

  // --- Normal game points ---
  let pointsA = state.currentPointsA;
  let pointsB = state.currentPointsB;
  let deuceCount = state.deuceCount ?? 0;
  const need = gameRules.pointsToWinGame;
  const wasAtDeuce =
    pointsA === pointsB && pointsA >= need - 1 && pointsB >= need - 1;

  if (delta < 0) {
    if (pending) {
      if (side !== pending) return null;
      // Undo held game win within the set.
      let gamesInSetA = state.gamesInSetA ?? 0;
      let gamesInSetB = state.gamesInSetB ?? 0;
      if (side === "a") {
        if (pointsA <= 0) return null;
        pointsA -= 1;
        gamesInSetA = Math.max(0, gamesInSetA - 1);
      } else {
        if (pointsB <= 0) return null;
        pointsB -= 1;
        gamesInSetB = Math.max(0, gamesInSetB - 1);
      }
      return {
        setsA,
        setsB,
        gameState: {
          ...state,
          currentPointsA: pointsA,
          currentPointsB: pointsB,
          gamesInSetA,
          gamesInSetB,
          pendingGameWinner: null,
          completedGames: state.completedGames.slice(0, -1),
        },
        gameJustWon: null,
        setJustWon: null,
        matchComplete: false,
        matchWinner: null,
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
    if (wasAtDeuce && !nowAtDeuce) deuceCount = Math.max(0, deuceCount - 1);
    return {
      setsA,
      setsB,
      gameState: { ...state, currentPointsA: pointsA, currentPointsB: pointsB, deuceCount },
      gameJustWon: null,
      setJustWon: null,
      matchComplete: matchDone.complete,
      matchWinner: matchDone.winner,
    };
  }

  if (side === "a") pointsA += 1;
  else pointsB += 1;

  const nowAtDeuce =
    pointsA === pointsB && pointsA >= need - 1 && pointsB >= need - 1;
  if (nowAtDeuce && !wasAtDeuce) deuceCount += 1;

  const gameDone = isGamePointComplete(pointsA, pointsB, gameRules, deuceCount);
  if (!gameDone.complete || !gameDone.winner) {
    return {
      setsA,
      setsB,
      gameState: {
        ...state,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        deuceCount,
        pendingGameWinner: null,
      },
      gameJustWon: null,
      setJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  // Game won — hold points; games-in-set update applied on "Next game" or immediately?
  // Mirror race-to-N: hold, then next game increments set games when confirmed.
  // For classic we increment games-in-set now (like race increments match games).
  const gamesInSetA = (state.gamesInSetA ?? 0) + (gameDone.winner === "a" ? 1 : 0);
  const gamesInSetB = (state.gamesInSetB ?? 0) + (gameDone.winner === "b" ? 1 : 0);

  const setCheck = isSetComplete(gamesInSetA, gamesInSetB, setRules);
  if (setCheck.needsTiebreak) {
    return {
      setsA,
      setsB,
      gameState: {
        ...state,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        completedGames: [...state.completedGames, { pointsA, pointsB }],
        pendingGameWinner: gameDone.winner,
        deuceCount,
        gamesInSetA,
        gamesInSetB,
        phase: "game", // operator taps next → we switch to set_tiebreak in startNext
      },
      gameJustWon: gameDone.winner,
      setJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  if (setCheck.complete && setCheck.winner) {
    // Hold game win; set completion applied when operator continues (startNextClassicAfterWin).
    return {
      setsA,
      setsB,
      gameState: {
        ...state,
        currentPointsA: pointsA,
        currentPointsB: pointsB,
        completedGames: [...state.completedGames, { pointsA, pointsB }],
        pendingGameWinner: gameDone.winner,
        deuceCount,
        gamesInSetA,
        gamesInSetB,
        phase: "game",
      },
      gameJustWon: gameDone.winner,
      setJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  return {
    setsA,
    setsB,
    gameState: {
      ...state,
      currentPointsA: pointsA,
      currentPointsB: pointsB,
      completedGames: [...state.completedGames, { pointsA, pointsB }],
      pendingGameWinner: gameDone.winner,
      deuceCount,
      gamesInSetA,
      gamesInSetB,
    },
    gameJustWon: gameDone.winner,
    setJustWon: null,
    matchComplete: false,
    matchWinner: null,
  };
}

function applyTbPoint(
  setsA: number,
  setsB: number,
  state: ClassicMatchGameState,
  side: "a" | "b",
  delta: 1 | -1,
  setRules: ClassicSetRules,
): ClassicScoreApplyResult | null {
  const isSuper = state.phase === "super_tiebreak";
  const to = isSuper ? setRules.superTiebreakTo : setRules.setTiebreakTo;
  const winBy = isSuper ? setRules.superTiebreakWinBy : setRules.setTiebreakWinBy;
  let tbA = state.tbPointsA ?? 0;
  let tbB = state.tbPointsB ?? 0;

  if (delta < 0) {
    if (side === "a") {
      if (tbA <= 0) return null;
      tbA -= 1;
    } else {
      if (tbB <= 0) return null;
      tbB -= 1;
    }
    return {
      setsA,
      setsB,
      gameState: { ...state, tbPointsA: tbA, tbPointsB: tbB },
      gameJustWon: null,
      setJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  if (side === "a") tbA += 1;
  else tbB += 1;

  const done = isTiebreakComplete(tbA, tbB, to, winBy);
  if (!done.complete || !done.winner) {
    return {
      setsA,
      setsB,
      gameState: { ...state, tbPointsA: tbA, tbPointsB: tbB },
      gameJustWon: null,
      setJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  // Tiebreak won → set won. Hold pending winner as set closer.
  const gamesA =
    (state.gamesInSetA ?? setRules.setTiebreakAt) + (done.winner === "a" ? 1 : 0);
  const gamesB =
    (state.gamesInSetB ?? setRules.setTiebreakAt) + (done.winner === "b" ? 1 : 0);

  return {
    setsA,
    setsB,
    gameState: {
      ...state,
      tbPointsA: tbA,
      tbPointsB: tbB,
      gamesInSetA: gamesA,
      gamesInSetB: gamesB,
      pendingGameWinner: done.winner,
      // Mark so startNext closes the set
      phase: state.phase,
    },
    gameJustWon: done.winner,
    setJustWon: null,
    matchComplete: false,
    matchWinner: null,
  };
}

/**
 * After a held game/TB win: reset points, or close the set / start STB / finish match.
 */
export function startNextClassicAfterWin(
  setsA: number,
  setsB: number,
  gameState: ClassicMatchGameState,
  setRules: ClassicSetRules,
): ClassicScoreApplyResult | null {
  const state = normalizeState(gameState);
  if (!state.pendingGameWinner) return null;

  const winner = state.pendingGameWinner;
  let nextSetsA = setsA;
  let nextSetsB = setsB;
  const gamesInSetA = state.gamesInSetA ?? 0;
  const gamesInSetB = state.gamesInSetB ?? 0;
  const setScores = [...(state.setScores ?? [])];

  // Closing a set tiebreak / super TB
  if (state.phase === "set_tiebreak" || state.phase === "super_tiebreak") {
    const viaSuper = state.phase === "super_tiebreak";
    setScores.push({
      gamesA: gamesInSetA,
      gamesB: gamesInSetB,
      viaTiebreak: !viaSuper,
      viaSuperTiebreak: viaSuper,
    });
    if (winner === "a") nextSetsA += 1;
    else nextSetsB += 1;

    const match = isClassicMatchComplete(nextSetsA, nextSetsB, setRules);
    return {
      setsA: nextSetsA,
      setsB: nextSetsB,
      gameState: {
        ...emptyClassicMatchGameState(),
        setScores,
        phase: match.complete
          ? "game"
          : shouldUseSuperTiebreak(nextSetsA, nextSetsB, setRules)
            ? "super_tiebreak"
            : "game",
      },
      gameJustWon: null,
      setJustWon: winner,
      matchComplete: match.complete,
      matchWinner: match.winner,
    };
  }

  // Normal game held — check if set is complete or needs TB
  const setCheck = isSetComplete(gamesInSetA, gamesInSetB, setRules);
  if (setCheck.needsTiebreak) {
    return {
      setsA,
      setsB,
      gameState: {
        ...state,
        currentPointsA: 0,
        currentPointsB: 0,
        pendingGameWinner: null,
        deuceCount: 0,
        phase: "set_tiebreak",
        tbPointsA: 0,
        tbPointsB: 0,
      },
      gameJustWon: null,
      setJustWon: null,
      matchComplete: false,
      matchWinner: null,
    };
  }

  if (setCheck.complete && setCheck.winner) {
    setScores.push({ gamesA: gamesInSetA, gamesB: gamesInSetB });
    if (setCheck.winner === "a") nextSetsA += 1;
    else nextSetsB += 1;

    const match = isClassicMatchComplete(nextSetsA, nextSetsB, setRules);
    const nextPhase: ClassicSetPhase =
      !match.complete && shouldUseSuperTiebreak(nextSetsA, nextSetsB, setRules)
        ? "super_tiebreak"
        : "game";

    return {
      setsA: nextSetsA,
      setsB: nextSetsB,
      gameState: {
        ...emptyClassicMatchGameState(),
        setScores,
        phase: nextPhase,
        tbPointsA: 0,
        tbPointsB: 0,
      },
      gameJustWon: null,
      setJustWon: setCheck.winner,
      matchComplete: match.complete,
      matchWinner: match.winner,
    };
  }

  // Continue set — next game at 0–0
  return {
    setsA,
    setsB,
    gameState: {
      ...state,
      currentPointsA: 0,
      currentPointsB: 0,
      pendingGameWinner: null,
      deuceCount: 0,
      phase: "game",
    },
    gameJustWon: null,
    setJustWon: null,
    matchComplete: false,
    matchWinner: null,
  };
}

export type MatchResultMethod = "normal" | "walkover" | "retirement" | "withdrawal";

/**
 * ITF walkover: winner awarded walkoverGamesPerSet–0 for each set needed to win the match.
 */
export function computeWalkoverScore(
  winnerSide: "a" | "b",
  setRules: ClassicSetRules,
): { setsA: number; setsB: number; setScores: SetScoreLine[]; gamesForA: number; gamesForB: number } {
  const need = setsNeededToWinMatch(setRules.bestOfSets);
  const g = setRules.walkoverGamesPerSet;
  const setScores: SetScoreLine[] = [];
  for (let i = 0; i < need; i++) {
    setScores.push(
      winnerSide === "a" ? { gamesA: g, gamesB: 0 } : { gamesA: 0, gamesB: g },
    );
  }
  const setsA = winnerSide === "a" ? need : 0;
  const setsB = winnerSide === "b" ? need : 0;
  const gamesForA = setScores.reduce((s, x) => s + x.gamesA, 0);
  const gamesForB = setScores.reduce((s, x) => s + x.gamesB, 0);
  return { setsA, setsB, setScores, gamesForA, gamesForB };
}

/**
 * ITF retirement: award remaining games in the current set to finish it, then
 * remaining sets as walkoverGames–0. Partial set score before retirement is kept.
 */
export function computeRetirementScore(
  winnerSide: "a" | "b",
  current: {
    setsA: number;
    setsB: number;
    gamesInSetA: number;
    gamesInSetB: number;
    setScores: SetScoreLine[];
  },
  setRules: ClassicSetRules,
): { setsA: number; setsB: number; setScores: SetScoreLine[]; gamesForA: number; gamesForB: number } {
  const need = setsNeededToWinMatch(setRules.bestOfSets);
  const gWin = setRules.gamesToWinSet;
  let setsA = current.setsA;
  let setsB = current.setsB;
  const setScores = [...current.setScores];

  let gamesA = current.gamesInSetA;
  let gamesB = current.gamesInSetB;

  // Finish current set if not already complete.
  const setDone = isSetComplete(gamesA, gamesB, setRules);
  if (!setDone.complete) {
    if (winnerSide === "a") {
      gamesA = Math.max(gamesA, gWin);
      if (gamesA - gamesB < setRules.setWinBy) {
        gamesA = gamesB + setRules.setWinBy;
      }
      gamesA = Math.max(gamesA, gWin);
    } else {
      gamesB = Math.max(gamesB, gWin);
      if (gamesB - gamesA < setRules.setWinBy) {
        gamesB = gamesA + setRules.setWinBy;
      }
      gamesB = Math.max(gamesB, gWin);
    }
    setScores.push({ gamesA, gamesB });
    if (winnerSide === "a") setsA += 1;
    else setsB += 1;
  }

  const wo = setRules.walkoverGamesPerSet;
  while (setsA < need && setsB < need) {
    if (winnerSide === "a") {
      setScores.push({ gamesA: wo, gamesB: 0 });
      setsA += 1;
    } else {
      setScores.push({ gamesA: 0, gamesB: wo });
      setsB += 1;
    }
  }

  const gamesForA = setScores.reduce((s, x) => s + x.gamesA, 0);
  const gamesForB = setScores.reduce((s, x) => s + x.gamesB, 0);
  return { setsA, setsB, setScores, gamesForA, gamesForB };
}

export function formatClassicSetScore(
  setsA: number,
  setsB: number,
  setScores?: SetScoreLine[],
): string {
  const sets = `${setsA}–${setsB}`;
  if (!setScores?.length) return sets;
  const detail = setScores.map((s) => `${s.gamesA}–${s.gamesB}`).join(", ");
  return `${sets} (${detail})`;
}
