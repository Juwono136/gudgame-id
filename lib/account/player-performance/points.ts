import type { StatsTier } from "@/db/schema/player-competition";

/** Ranking points per match outcome — weighted by event tier (similar to pro tour systems). */
export const MATCH_POINTS_BY_TIER: Record<
  StatsTier,
  { win: number; loss: number }
> = {
  official_paid: { win: 100, loss: 25 },
  official_free: { win: 60, loss: 15 },
  fun_match: { win: 20, loss: 5 },
};

export function pointsForMatch(
  statsTier: StatsTier | null | undefined,
  isOfficial: boolean,
  resultType: "win" | "loss",
): number {
  const tier: StatsTier =
    statsTier ??
    (isOfficial ? "official_free" : "fun_match");
  const table = MATCH_POINTS_BY_TIER[tier];
  return resultType === "win" ? table.win : table.loss;
}
