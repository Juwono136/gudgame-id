import { describe, expect, it } from "vitest";
import {
  canIncrementScore,
  isMatchComplete,
  resolveTimedWinner,
} from "@/lib/tournaments/scoring/engine";
import { defaultDeuceConfig } from "@/lib/tournaments/settings";

const rules21 = {
  pointsPerMatch: 21,
  deuceConfig: defaultDeuceConfig(21),
  scoringType: "points" as const,
};

describe("scoring engine deuce", () => {
  it("wins at 21-19 without deuce", () => {
    expect(isMatchComplete(21, 19, rules21)).toEqual({ complete: true, winner: "a" });
  });

  it("requires win-by-2 at 20-20", () => {
    expect(isMatchComplete(20, 20, rules21)).toEqual({ complete: false, winner: null });
    expect(isMatchComplete(21, 20, rules21)).toEqual({ complete: false, winner: null });
    expect(isMatchComplete(22, 20, rules21)).toEqual({ complete: true, winner: "a" });
  });

  it("respects maxScore cap", () => {
    expect(isMatchComplete(30, 28, rules21)).toEqual({ complete: true, winner: "a" });
    expect(canIncrementScore(29, 28, "a", rules21)).toBe(true);
    expect(canIncrementScore(30, 28, "a", rules21)).toBe(false);
  });
});

describe("timed winner", () => {
  it("picks higher score", () => {
    expect(resolveTimedWinner(15, 12)).toEqual({ complete: true, winner: "a" });
    expect(resolveTimedWinner(10, 10)).toEqual({ complete: false, winner: null });
  });
});
