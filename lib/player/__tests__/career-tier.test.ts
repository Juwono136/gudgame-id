import { describe, expect, it } from "vitest";
import { nextTierProgress } from "@/lib/player/format-ranking-points";
import { deriveTierFromPoints, resolveCareerTierLevel } from "@/lib/player/tier";

describe("career tier from ranking points", () => {
  it("derives tier from points, not stale stored tier", () => {
    expect(
      resolveCareerTierLevel({ totalPoints: 135, storedTier: "bronze" }),
    ).toBe("platinum");
    expect(
      resolveCareerTierLevel({ totalPoints: 55, storedTier: "bronze" }),
    ).toBe("gold");
    expect(
      resolveCareerTierLevel({ totalPoints: 12, storedTier: "gold" }),
    ).toBe("bronze");
  });

  it("falls back to stored tier only when points are missing", () => {
    expect(resolveCareerTierLevel({ totalPoints: null, storedTier: "silver" })).toBe(
      "silver",
    );
  });

  it("progresses tier-by-tier toward the next threshold", () => {
    expect(deriveTierFromPoints(135)).toBe("platinum");
    const progress = nextTierProgress(135);
    expect(progress?.currentLabel).toBe("Platinum");
    expect(progress?.nextLabel).toBe("International / National");
    expect(progress?.target).toBe(150);
  });

  it("marks max tier when international threshold is reached", () => {
    const progress = nextTierProgress(160);
    expect(progress?.currentLabel).toBe("International / National");
    expect(progress?.nextLabel).toBeNull();
    expect(progress?.percent).toBe(100);
  });
});
