import { describe, expect, it } from "vitest";
import {
  fixtureCountForGroupSize,
  generateRoundRobinFixtures,
} from "@/lib/tournaments/double-stage/fixtures";
import { planMexicanoRound } from "@/lib/tournaments/mexicano/round-planner";
import { resolveSeriesMajority } from "@/lib/tournaments/scoring/match-scoring";

describe("group meetings fixtures", () => {
  it("multiplies RR fixtures by meetingsPerPair", () => {
    const teams = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
      { id: "4", name: "D" },
    ];
    const once = generateRoundRobinFixtures(teams, 1);
    const thrice = generateRoundRobinFixtures(teams, 3);
    expect(once).toHaveLength(6);
    expect(thrice).toHaveLength(18);
    expect(fixtureCountForGroupSize(4, 3)).toBe(18);
    expect(thrice.filter((f) => f.meetingIndex === 2)).toHaveLength(6);
  });
});

describe("mexicano planner", () => {
  it("pairs nearby ranks for individual mode after round 1", () => {
    const players = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      id: String(n),
      name: `P${n}`,
      points: 100 - n,
    }));
    const plan = planMexicanoRound({
      players,
      roundNumber: 2,
      mode: "individual",
      courtCount: 2,
    });
    expect(plan.pairings).toHaveLength(2);
    // Rank 1+4 vs 2+3 in first block
    expect(plan.pairings[0]!.teamA.map((p) => p.id).sort()).toEqual(["1", "4"]);
    expect(plan.pairings[0]!.teamB.map((p) => p.id).sort()).toEqual(["2", "3"]);
  });
});

describe("series majority", () => {
  it("advances when one side wins a majority of legs", () => {
    const result = resolveSeriesMajority(["a", "b", "a"]);
    expect(result.status).toBe("complete");
    expect(result.winner).toBe("a");
    expect(result.winsA).toBe(2);
  });

  it("stays incomplete until majority is possible", () => {
    const result = resolveSeriesMajority(["a", null, null]);
    expect(result.status).toBe("incomplete");
  });
});
