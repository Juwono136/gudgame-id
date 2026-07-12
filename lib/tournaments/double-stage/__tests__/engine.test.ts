import { describe, expect, it } from "vitest";
import {
  distributeTeamsToGroups,
  planBalancedGroups,
} from "@/lib/tournaments/double-stage/allocate-groups";
import {
  fixtureCountForGroupSize,
  generateRoundRobinFixtures,
} from "@/lib/tournaments/double-stage/fixtures";
import { computeGroupStandings } from "@/lib/tournaments/double-stage/standings";
import {
  assignGlobalSeeds,
  planPlayInAndByes,
  standardBracketPairings,
} from "@/lib/tournaments/double-stage/seeding";
import { DEFAULT_STANDINGS_SCORING } from "@/lib/tournaments/scoring/config";

describe("planBalancedGroups", () => {
  it("allocates 8 teams into 2 groups of 4", () => {
    expect(planBalancedGroups(8, 4)).toEqual({ groupCount: 2, sizes: [4, 4] });
  });

  it("allocates 34 teams into 9 groups (7×4 + 2×3)", () => {
    const plan = planBalancedGroups(34, 4);
    expect(plan.groupCount).toBe(9);
    expect(plan.sizes.reduce((a, b) => a + b, 0)).toBe(34);
    expect(Math.max(...plan.sizes)).toBeLessThanOrEqual(4);
  });
});

describe("distributeTeamsToGroups", () => {
  it("assigns every team exactly once", () => {
    const teams = Array.from({ length: 20 }, (_, i) => ({
      id: `t${i}`,
      name: `Team ${i}`,
    }));
    const groups = distributeTeamsToGroups(teams, 4);
    const assigned = groups.flatMap((g) => g.teams);
    expect(assigned).toHaveLength(20);
    expect(new Set(assigned.map((t) => t.id)).size).toBe(20);
  });
});

describe("generateRoundRobinFixtures", () => {
  it("generates 6 matches for 4 teams", () => {
    const teams = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ];
    expect(generateRoundRobinFixtures(teams)).toHaveLength(6);
    expect(fixtureCountForGroupSize(4)).toBe(6);
  });
});

describe("computeGroupStandings", () => {
  const teams = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
    { id: "d", name: "D" },
  ];

  it("ranks by points and qualifies top 2", () => {
    const matches = [
      { teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 0, status: "completed" },
      { teamAId: "a", teamBId: "c", scoreA: 2, scoreB: 1, status: "completed" },
      { teamAId: "a", teamBId: "d", scoreA: 2, scoreB: 0, status: "completed" },
      { teamAId: "b", teamBId: "c", scoreA: 2, scoreB: 0, status: "completed" },
      { teamAId: "b", teamBId: "d", scoreA: 2, scoreB: 1, status: "completed" },
      { teamAId: "c", teamBId: "d", scoreA: 2, scoreB: 0, status: "completed" },
    ];
    const standings = computeGroupStandings(teams, matches, DEFAULT_STANDINGS_SCORING, 2);
    expect(standings[0]!.teamId).toBe("a");
    expect(standings.filter((s) => s.qualificationStatus === "qualified")).toHaveLength(2);
  });
});

describe("seeding and play-in", () => {
  it("standard 16-team pairings", () => {
    expect(standardBracketPairings(16)).toEqual([
      [1, 16],
      [8, 9],
      [4, 13],
      [5, 12],
      [2, 15],
      [7, 10],
      [3, 14],
      [6, 11],
    ]);
  });

  it("plans play-in for 10 qualified teams", () => {
    const seeded = assignGlobalSeeds(
      Array.from({ length: 10 }, (_, i) => ({
        teamId: `t${i}`,
        teamName: `T${i}`,
        groupId: `g${i % 4}`,
        groupName: `G${i % 4}`,
        groupRank: (i % 2) + 1,
        points: 10 - i,
        wins: 3,
        scoreDiff: 5,
        scoreFor: 10,
      })),
    );
    const plan = planPlayInAndByes(seeded);
    expect(plan.bracketSize).toBe(16);
    expect(plan.byeCount).toBe(6);
    expect(plan.playInMatchCount).toBe(2);
  });
});
