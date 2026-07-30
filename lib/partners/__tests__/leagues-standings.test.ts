import { describe, expect, it } from "vitest";
import { computeLeagueStandings } from "@/lib/partners/league-types";

describe("computeLeagueStandings", () => {
  it("ranks by points then diff", () => {
    const teams = [
      { id: "a", name: "Alpha", sortOrder: 0 },
      { id: "b", name: "Beta", sortOrder: 1 },
      { id: "c", name: "Charlie", sortOrder: 2 },
    ];
    const matches = [
      {
        id: "1",
        teamAId: "a",
        teamAName: "Alpha",
        teamBId: "b",
        teamBName: "Beta",
        scoreA: 6,
        scoreB: 4,
        status: "completed" as const,
        playedAt: null,
        notes: null,
      },
      {
        id: "2",
        teamAId: "a",
        teamAName: "Alpha",
        teamBId: "c",
        teamBName: "Charlie",
        scoreA: 3,
        scoreB: 3,
        status: "completed" as const,
        playedAt: null,
        notes: null,
      },
      {
        id: "3",
        teamAId: "b",
        teamAName: "Beta",
        teamBId: "c",
        teamBName: "Charlie",
        scoreA: 2,
        scoreB: 5,
        status: "scheduled" as const,
        playedAt: null,
        notes: null,
      },
    ];

    const standings = computeLeagueStandings(teams, matches);
    expect(standings.map((r) => r.teamId)).toEqual(["a", "c", "b"]);
    expect(standings[0]).toMatchObject({ wins: 1, draws: 1, points: 4, diff: 2 });
    expect(standings[1]).toMatchObject({ draws: 1, points: 1, diff: 0 });
    expect(standings[2]).toMatchObject({ losses: 1, points: 0, diff: -2 });
  });
});
