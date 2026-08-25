import { describe, expect, it } from "vitest";
import {
  formatMatchWinRate,
  matchWinRateFraction,
  matchWinRatePercent,
} from "@/lib/tournaments/stats/win-rate";

describe("matchWinRatePercent", () => {
  it("returns 0 when no matches played", () => {
    expect(matchWinRatePercent(0, 0)).toBe(0);
    expect(matchWinRateFraction(5, 0)).toBe(0);
  });

  it("uses wins ÷ matches played (ties dilute rate)", () => {
    expect(matchWinRatePercent(2, 3)).toBe(66.7);
    expect(matchWinRatePercent(1, 1)).toBe(100);
    expect(matchWinRatePercent(0, 2)).toBe(0);
    // 2 wins + 1 draw in 3 matches → still 2/3
    expect(matchWinRatePercent(2, 3)).toBe(66.7);
  });

  it("formats with percent suffix", () => {
    expect(formatMatchWinRate(1, 2)).toBe("50%");
  });
});
