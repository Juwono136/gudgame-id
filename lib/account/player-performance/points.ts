import type { StatsTier } from "@/db/schema/player-competition";
import {
  matchPointsForTournamentTier,
  normalizePlayerTier,
  type PlayerTierLevel,
} from "@/lib/player/tier";

/**
 * Legacy stats_tier values (billing category). Kept for stored rows & filtering.
 * Ranking deltas for Official now come from tournament skill tier (±1/3/5/8/10).
 */
export const LEGACY_MATCH_POINTS_BY_STATS_TIER: Record<
  StatsTier,
  { win: number; loss: number }
> = {
  official_paid: { win: 5, loss: -5 },
  official_free: { win: 5, loss: -5 },
  fun_match: { win: 0, loss: 0 },
};

export type RankingPointsInput = {
  isOfficial: boolean;
  /** Billing category on the match row (official_paid | official_free | fun_match). */
  statsTier?: StatsTier | string | null;
  /** Tournament skill tier that determined the ± ranking delta. "open" = No Rank. */
  skillTier?: PlayerTierLevel | string | null;
  resultType: "win" | "loss";
};

/**
 * Ranking points for one match outcome.
 * - Fun Match → always 0 (does not affect tier / ranking / win-rate aggregates).
 * - Official → ± tournament tier points (Bronze 1 … International 10).
 */
export function pointsForMatch(
  statsTierOrInput: StatsTier | null | undefined | RankingPointsInput,
  isOfficial?: boolean,
  resultType?: "win" | "loss",
): number {
  // New object API
  if (
    statsTierOrInput &&
    typeof statsTierOrInput === "object" &&
    "resultType" in statsTierOrInput
  ) {
    return rankingDeltaForMatch(statsTierOrInput);
  }

  // Legacy positional API — used by older call sites during transition
  return rankingDeltaForMatch({
    statsTier: statsTierOrInput as StatsTier | null | undefined,
    isOfficial: Boolean(isOfficial),
    resultType: resultType === "win" ? "win" : "loss",
  });
}

export function rankingDeltaForMatch(input: RankingPointsInput): number {
  if (!input.isOfficial) return 0;
  if (input.statsTier === "fun_match") return 0;

  // No Rank / open ranking tournaments contribute 0 career points.
  if (input.skillTier === "open" || input.skillTier === "no_rank") return 0;

  const skill = normalizePlayerTier(
    typeof input.skillTier === "string" ? input.skillTier : input.skillTier ?? null,
  );

  if (skill) {
    const amount = matchPointsForTournamentTier(skill);
    return input.resultType === "win" ? amount : -amount;
  }

  // Official without a resolvable skill tier (misconfigured / legacy) → 0.
  // Do not invent Gold ±5; No Rank and incomplete settings must not award points.
  return 0;
}

/** @deprecated Prefer rankingDeltaForMatch — kept for import compatibility */
export const MATCH_POINTS_BY_TIER = LEGACY_MATCH_POINTS_BY_STATS_TIER;
