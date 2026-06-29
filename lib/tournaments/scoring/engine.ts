import type { TournamentDeuceConfig, TournamentScoringType } from "@/lib/tournaments/settings";

export type ScoringRules = {
  pointsPerMatch: number;
  deuceConfig: TournamentDeuceConfig;
  scoringType: TournamentScoringType;
};

export type MatchScorePhase = "normal" | "deuce" | "match_point" | "cap";

export type MatchCompletion = {
  complete: boolean;
  winner: "a" | "b" | null;
};

export function getMatchScorePhase(
  scoreA: number,
  scoreB: number,
  rules: ScoringRules,
): MatchScorePhase {
  const { deuceConfig, pointsPerMatch } = rules;
  const max = Math.max(scoreA, scoreB);
  const lead = Math.abs(scoreA - scoreB);

  if (max >= deuceConfig.maxScore) return "cap";

  if (
    deuceConfig.deuceEnabled &&
    scoreA >= deuceConfig.deuceThreshold &&
    scoreB >= deuceConfig.deuceThreshold
  ) {
    if (lead >= deuceConfig.winBy - 1) return "match_point";
    return "deuce";
  }

  if (
    max >= pointsPerMatch - 1 &&
    (lead === 0 || (lead === 1 && Math.min(scoreA, scoreB) >= pointsPerMatch - 1))
  ) {
    return "match_point";
  }

  return "normal";
}

export function isMatchComplete(
  scoreA: number,
  scoreB: number,
  rules: ScoringRules,
): MatchCompletion {
  if (scoreA < 0 || scoreB < 0) return { complete: false, winner: null };
  if (scoreA === scoreB) return { complete: false, winner: null };

  const { deuceConfig, pointsPerMatch } = rules;
  const max = Math.max(scoreA, scoreB);
  const min = Math.min(scoreA, scoreB);
  const lead = max - min;
  const leader: "a" | "b" = scoreA > scoreB ? "a" : "b";

  if (max >= deuceConfig.maxScore) {
    if (lead >= deuceConfig.winBy) return { complete: true, winner: leader };
    if (max === deuceConfig.maxScore && min < max) return { complete: true, winner: leader };
    return { complete: false, winner: null };
  }

  if (!deuceConfig.deuceEnabled) {
    if (max >= pointsPerMatch && lead > 0) return { complete: true, winner: leader };
    return { complete: false, winner: null };
  }

  if (max < deuceConfig.deuceThreshold) {
    if (max >= pointsPerMatch && lead > 0) return { complete: true, winner: leader };
    return { complete: false, winner: null };
  }

  if (lead >= deuceConfig.winBy && max >= deuceConfig.deuceThreshold) {
    return { complete: true, winner: leader };
  }

  return { complete: false, winner: null };
}

export function maxAllowedScore(
  current: number,
  opponent: number,
  rules: ScoringRules,
): number {
  const { deuceConfig } = rules;
  let cap = deuceConfig.maxScore;

  if (!deuceConfig.deuceEnabled) {
    cap = Math.min(cap, rules.pointsPerMatch);
  }

  return cap;
}

export function canIncrementScore(
  scoreA: number,
  scoreB: number,
  side: "a" | "b",
  rules: ScoringRules,
): boolean {
  const completion = isMatchComplete(scoreA, scoreB, rules);
  if (completion.complete) return false;

  const current = side === "a" ? scoreA : scoreB;
  const opponent = side === "a" ? scoreB : scoreA;
  const next = current + 1;

  if (next > maxAllowedScore(current, opponent, rules)) return false;

  return true;
}

export function applyScoreDelta(
  scoreA: number,
  scoreB: number,
  side: "a" | "b",
  delta: number,
  rules: ScoringRules,
): { scoreA: number; scoreB: number } | null {
  if (delta === 0) return { scoreA, scoreB };

  if (delta > 0) {
    let a = scoreA;
    let b = scoreB;
    for (let i = 0; i < delta; i++) {
      const s = side === "a" ? "a" : "b";
      if (!canIncrementScore(a, b, s, rules)) return null;
      if (side === "a") a += 1;
      else b += 1;
    }
    return { scoreA: a, scoreB: b };
  }

  const current = side === "a" ? scoreA : scoreB;
  const next = Math.max(0, current + delta);
  if (side === "a") return { scoreA: next, scoreB };
  return { scoreA, scoreB: next };
}

export function computeTimerEndsAt(
  startedAt: Date,
  durationMinutes: number,
  extensionMinutes = 0,
): Date {
  return new Date(startedAt.getTime() + (durationMinutes + extensionMinutes) * 60_000);
}

export function resolveTimedWinner(
  scoreA: number,
  scoreB: number,
): MatchCompletion {
  if (scoreA === scoreB) return { complete: false, winner: null };
  return { complete: true, winner: scoreA > scoreB ? "a" : "b" };
}

export function isTimerExpired(timerEndsAt: Date | null | undefined, now = new Date()): boolean {
  if (!timerEndsAt) return false;
  return now.getTime() >= timerEndsAt.getTime();
}
