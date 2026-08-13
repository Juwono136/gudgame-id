/**
 * Resolve winners for a single match/leg given Official matchScoring config.
 */

import type { MatchScoringConfig } from "@/lib/tournaments/match-config";

export type MatchScoreSide = {
  /** Flat points or games won in a race-to match. */
  points?: number;
  /** Per-set scores when using best_of or total (e.g. [[6,4],[3,6],[7,5]]). */
  sets?: Array<[number, number]>;
};

export type MatchScoringVerdict = {
  status: "incomplete" | "complete" | "draw";
  winner: "a" | "b" | null;
  setsWonA?: number;
  setsWonB?: number;
  reason?: string;
};

function nonNegInt(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** First side to win `needed` sets wins (Best of). Remaining sets not required. */
function resolveBestOf(
  sets: Array<[number, number]>,
  bestOf: 3 | 5,
  setTarget: number,
): MatchScoringVerdict {
  const needed = Math.ceil(bestOf / 2);
  let setsWonA = 0;
  let setsWonB = 0;

  for (const [a, b] of sets) {
    if (a < 0 || b < 0) {
      return { status: "incomplete", winner: null, reason: "Negative set score" };
    }
    if (a >= setTarget && a > b) setsWonA += 1;
    else if (b >= setTarget && b > a) setsWonB += 1;
    else if (a === b) {
      return { status: "incomplete", winner: null, reason: "Set tied — continue play" };
    } else {
      return { status: "incomplete", winner: null, reason: "Set incomplete" };
    }
    if (setsWonA >= needed || setsWonB >= needed) break;
  }

  if (setsWonA >= needed) {
    return { status: "complete", winner: "a", setsWonA, setsWonB };
  }
  if (setsWonB >= needed) {
    return { status: "complete", winner: "b", setsWonA, setsWonB };
  }
  return { status: "incomplete", winner: null, setsWonA, setsWonB };
}

/** All `totalSets` must be played; highest set wins (or points sum) decides. */
function resolveTotal(
  sets: Array<[number, number]>,
  totalSets: number,
): MatchScoringVerdict {
  if (sets.length < totalSets) {
    return {
      status: "incomplete",
      winner: null,
      reason: `Need ${totalSets} sets played`,
    };
  }

  let setsWonA = 0;
  let setsWonB = 0;
  for (let i = 0; i < totalSets; i++) {
    const pair = sets[i];
    if (!pair) {
      return { status: "incomplete", winner: null };
    }
    const [a, b] = pair;
    if (a > b) setsWonA += 1;
    else if (b > a) setsWonB += 1;
  }

  if (setsWonA > setsWonB) {
    return { status: "complete", winner: "a", setsWonA, setsWonB };
  }
  if (setsWonB > setsWonA) {
    return { status: "complete", winner: "b", setsWonA, setsWonB };
  }
  return {
    status: "draw",
    winner: null,
    setsWonA,
    setsWonB,
    reason: "Equal sets after Total",
  };
}

function resolveRaceTo(pointsA: number, pointsB: number, target: number): MatchScoringVerdict {
  if (pointsA < 0 || pointsB < 0) {
    return { status: "incomplete", winner: null, reason: "Negative score" };
  }
  if (pointsA >= target && pointsA > pointsB) {
    return { status: "complete", winner: "a" };
  }
  if (pointsB >= target && pointsB > pointsA) {
    return { status: "complete", winner: "b" };
  }
  return { status: "incomplete", winner: null };
}

function resolveCustomScore(
  pointsA: number,
  pointsB: number,
  config: NonNullable<MatchScoringConfig["customScore"]>,
  hostForcedWinner?: "a" | "b" | "draw" | null,
): MatchScoringVerdict {
  if (pointsA < 0 || pointsB < 0) {
    return { status: "incomplete", winner: null, reason: "Score cannot be negative" };
  }

  if (hostForcedWinner === "a" || hostForcedWinner === "b") {
    return { status: "complete", winner: hostForcedWinner };
  }
  if (hostForcedWinner === "draw") {
    return { status: "draw", winner: null };
  }

  if (pointsA > pointsB) return { status: "complete", winner: "a" };
  if (pointsB > pointsA) return { status: "complete", winner: "b" };

  if (config.allowDraw || config.tiePolicy === "allow_draw") {
    return { status: "draw", winner: null, reason: "Draw allowed" };
  }
  if (config.tiePolicy === "host_manual" || config.tiePolicy === "host_tiebreak") {
    return {
      status: "incomplete",
      winner: null,
      reason: "Tied — host must decide the winner",
    };
  }
  return {
    status: "incomplete",
    winner: null,
    reason: "Tied — continue until one side leads",
  };
}

export function resolveMatchScoring(input: {
  config: MatchScoringConfig;
  sideA: MatchScoreSide;
  sideB: MatchScoreSide;
  /** Host override for custom_score / tiebreak. */
  hostForcedWinner?: "a" | "b" | "draw" | null;
  /**
   * When true (custom large_score), match only completes on host Complete Match.
   * Pass status via hostForcedWinner or completed flag.
   */
  hostMarkedComplete?: boolean;
}): MatchScoringVerdict {
  const { config, sideA, sideB } = input;

  if (config.mode === "best_of") {
    const sets = sideA.sets ?? [];
    return resolveBestOf(sets, config.bestOf ?? 3, config.setTarget?.value ?? 4);
  }

  if (config.mode === "total") {
    const sets = sideA.sets ?? [];
    return resolveTotal(sets, config.totalSets ?? 3);
  }

  if (config.mode === "race_to") {
    const a = nonNegInt(sideA.points) ?? 0;
    const b = nonNegInt(sideB.points) ?? 0;
    return resolveRaceTo(a, b, config.raceTo?.value ?? 4);
  }

  // custom_score
  const a = nonNegInt(sideA.points) ?? 0;
  const b = nonNegInt(sideB.points) ?? 0;
  const cs = config.customScore ?? {
    variant: "one_match_winner" as const,
    allowDraw: false,
    tiePolicy: "continue" as const,
  };

  if (cs.variant === "large_score" && !input.hostMarkedComplete && !input.hostForcedWinner) {
    return {
      status: "incomplete",
      winner: null,
      reason: "Host must complete the match",
    };
  }

  if (cs.variant === "large_score" && input.hostMarkedComplete) {
    return resolveCustomScore(a, b, cs, input.hostForcedWinner);
  }

  return resolveCustomScore(a, b, cs, input.hostForcedWinner);
}

/** Majority of completed legs → series winner (knockout custom meetings). */
export function resolveSeriesMajority(legWinners: Array<"a" | "b" | "draw" | null>): {
  status: "incomplete" | "complete" | "draw";
  winner: "a" | "b" | null;
  winsA: number;
  winsB: number;
} {
  let winsA = 0;
  let winsB = 0;
  let pending = 0;
  for (const w of legWinners) {
    if (w === "a") winsA += 1;
    else if (w === "b") winsB += 1;
    else pending += 1;
  }
  const total = legWinners.length;
  const needed = Math.floor(total / 2) + 1;
  if (winsA >= needed) return { status: "complete", winner: "a", winsA, winsB };
  if (winsB >= needed) return { status: "complete", winner: "b", winsA, winsB };
  if (pending === 0 && winsA === winsB) {
    return { status: "draw", winner: null, winsA, winsB };
  }
  return { status: "incomplete", winner: null, winsA, winsB };
}
