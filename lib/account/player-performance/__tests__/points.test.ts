import { describe, expect, it } from "vitest";
import { rankingDeltaForMatch } from "@/lib/account/player-performance/points";
import { TOURNAMENT_TIER_MATCH_POINTS } from "@/lib/player/tier";

describe("rankingDeltaForMatch", () => {
  it.each([
    ["bronze", 1],
    ["silver", 3],
    ["gold", 5],
    ["platinum", 8],
    ["international", 10],
  ] as const)("awards +pts for a win in a %s tournament", (tier, pts) => {
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_free",
        skillTier: tier,
        resultType: "win",
      }),
    ).toBe(pts);
    expect(TOURNAMENT_TIER_MATCH_POINTS[tier]).toBe(pts);
  });

  it.each([
    ["bronze", -1],
    ["silver", -3],
    ["gold", -5],
    ["platinum", -8],
    ["international", -10],
  ] as const)("subtracts pts for a loss in a %s tournament", (tier, pts) => {
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_paid",
        skillTier: tier,
        resultType: "loss",
      }),
    ).toBe(pts);
  });

  it("ignores fun matches", () => {
    expect(
      rankingDeltaForMatch({
        isOfficial: false,
        statsTier: "fun_match",
        skillTier: "gold",
        resultType: "win",
      }),
    ).toBe(0);
  });

  it("falls back to legacy ±5 when skill tier is missing", () => {
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_free",
        resultType: "win",
      }),
    ).toBe(5);
    expect(
      rankingDeltaForMatch({
        isOfficial: true,
        statsTier: "official_free",
        resultType: "loss",
      }),
    ).toBe(-5);
  });
});
