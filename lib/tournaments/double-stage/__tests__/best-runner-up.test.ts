import { describe, expect, it } from "vitest";
import {
  applyBestRunnerUpQualification,
  computeCrossPoolBestRunnerUps,
  computeGroupStandings,
  gameWinPct,
  setWinPct,
  type CompletedGroupMatch,
  type TeamStandingRow,
} from "@/lib/tournaments/double-stage/standings";
import { buildQualifiedTeamsFromStandings } from "@/lib/tournaments/double-stage/qualification";
import {
  DEFAULT_STANDINGS_SCORING,
  GAMES_SPORT_TIE_BREAKERS,
  getDefaultStandingsScoringForSport,
  type StandingsScoringConfig,
} from "@/lib/tournaments/scoring/config";

const gamesConfig: StandingsScoringConfig = {
  ...DEFAULT_STANDINGS_SCORING,
  scoreUnit: "games",
  tieBreakers: GAMES_SPORT_TIE_BREAKERS,
};

function completed(
  a: string,
  b: string,
  scoreA: number,
  scoreB: number,
): CompletedGroupMatch {
  return { teamAId: a, teamBId: b, scoreA, scoreB, status: "completed" };
}

describe("getDefaultStandingsScoringForSport", () => {
  it("uses ITF-ish tiebreakers for padel and tennis", () => {
    expect(getDefaultStandingsScoringForSport("padel").tieBreakers).toEqual(
      GAMES_SPORT_TIE_BREAKERS,
    );
    expect(getDefaultStandingsScoringForSport("tennis").tieBreakers).toEqual(
      GAMES_SPORT_TIE_BREAKERS,
    );
    expect(getDefaultStandingsScoringForSport("futsal").tieBreakers).toEqual(
      DEFAULT_STANDINGS_SCORING.tieBreakers,
    );
  });
});

describe("setWinPct / gameWinPct helpers", () => {
  it("computes match-win and game-win percentages", () => {
    expect(setWinPct({ wins: 2, played: 3, setsFor: 0, setsAgainst: 0 })).toBeCloseTo(2 / 3);
    expect(setWinPct({ wins: 0, played: 0, setsFor: 0, setsAgainst: 0 })).toBe(0);
    expect(
      gameWinPct({ scoreFor: 12, scoreAgainst: 8, gamesFor: 0, gamesAgainst: 0 }),
    ).toBeCloseTo(0.6);
    expect(
      gameWinPct({ scoreFor: 0, scoreAgainst: 0, gamesFor: 0, gamesAgainst: 0 }),
    ).toBe(0);
  });
});

describe("games-sport tiebreakers", () => {
  const teams = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ];

  it("ranks by wins then matchesPlayed (ITF), before H2H", () => {
    const four = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ];
    // A: beat C, lost to B → 1W1L, played 2
    // B: beat A only → 1W, played 1
    // Same wins → more matches played ranks higher (ITF).
    const matches = [completed("a", "c", 6, 3), completed("a", "b", 4, 6)];
    const standings = computeGroupStandings(four, matches, gamesConfig, 2, {
      lockQualification: false,
    });
    const a = standings.find((s) => s.teamId === "a")!;
    const b = standings.find((s) => s.teamId === "b")!;
    expect(a.wins).toBe(b.wins);
    expect(a.played).toBeGreaterThan(b.played);
    expect(a.rank).toBeLessThan(b.rank);
  });

  it("breaks remaining ties by gameWinPct", () => {
    // Equal points, wins, matchesPlayed; different game ratios.
    // Round robin 3 teams: A beats B 6-0, B beats C 6-5, C beats A 6-5
    // Each: 1W1L, 3pts, played 2.
    // A games: 6+5=11 for, 0+6=6 against → 11/17
    // B games: 0+6=6 for, 6+5=11 against → 6/17
    // C games: 5+6=11 for, 6+5=11 against → 11/22
    const matches = [
      completed("a", "b", 6, 0),
      completed("b", "c", 6, 5),
      completed("c", "a", 6, 5),
    ];
    const standings = computeGroupStandings(teams, matches, gamesConfig, 2);
    expect(standings[0]!.teamId).toBe("a"); // best gameWinPct
    expect(standings.map((s) => s.teamId)).toEqual(["a", "c", "b"]);
  });
});

describe("computeCrossPoolBestRunnerUps", () => {
  function makeGroup(
    id: string,
    rows: Pick<
      TeamStandingRow,
      "teamId" | "teamName" | "rank" | "points" | "wins" | "played" | "scoreFor" | "scoreAgainst" | "scoreDiff"
    >[],
    teamsAdvance = 2,
  ) {
    return {
      id,
      name: id.toUpperCase(),
      standings: rows.map((r) => ({
        ...r,
        losses: Math.max(0, r.played - r.wins),
        draws: 0,
        setsFor: r.scoreFor,
        setsAgainst: r.scoreAgainst,
        gamesFor: r.scoreFor,
        gamesAgainst: r.scoreAgainst,
        qualificationStatus:
          r.rank <= teamsAdvance ? ("qualified" as const) : ("eliminated" as const),
      })),
    };
  }

  it("selects top runners-up across pools by standings metrics", () => {
    const groups = [
      makeGroup("g1", [
        {
          teamId: "a1",
          teamName: "A1",
          rank: 1,
          points: 9,
          wins: 3,
          played: 3,
          scoreFor: 18,
          scoreAgainst: 6,
          scoreDiff: 12,
        },
        {
          teamId: "a2",
          teamName: "A2",
          rank: 2,
          points: 6,
          wins: 2,
          played: 3,
          scoreFor: 14,
          scoreAgainst: 10,
          scoreDiff: 4,
        },
        {
          teamId: "a3",
          teamName: "A3",
          rank: 3,
          points: 3,
          wins: 1,
          played: 3,
          scoreFor: 10,
          scoreAgainst: 12,
          scoreDiff: -2,
        },
      ]),
      makeGroup("g2", [
        {
          teamId: "b1",
          teamName: "B1",
          rank: 1,
          points: 9,
          wins: 3,
          played: 3,
          scoreFor: 18,
          scoreAgainst: 4,
          scoreDiff: 14,
        },
        {
          teamId: "b2",
          teamName: "B2",
          rank: 2,
          points: 6,
          wins: 2,
          played: 3,
          scoreFor: 12,
          scoreAgainst: 10,
          scoreDiff: 2,
        },
        {
          teamId: "b3",
          teamName: "B3",
          rank: 3,
          points: 6,
          wins: 2,
          played: 3,
          scoreFor: 15,
          scoreAgainst: 9,
          scoreDiff: 6,
        },
      ]),
      makeGroup("g3", [
        {
          teamId: "c1",
          teamName: "C1",
          rank: 1,
          points: 9,
          wins: 3,
          played: 3,
          scoreFor: 16,
          scoreAgainst: 8,
          scoreDiff: 8,
        },
        {
          teamId: "c2",
          teamName: "C2",
          rank: 2,
          points: 6,
          wins: 2,
          played: 3,
          scoreFor: 13,
          scoreAgainst: 11,
          scoreDiff: 2,
        },
        {
          teamId: "c3",
          teamName: "C3",
          rank: 3,
          points: 4,
          wins: 1,
          played: 3,
          scoreFor: 11,
          scoreAgainst: 11,
          scoreDiff: 0,
        },
      ]),
    ];

    // teamsAdvance=2 → runners are rank 3: a3 (3pts), b3 (6pts), c3 (4pts)
    // bestRunnerUpSlots=2 → b3 then c3
    const best = computeCrossPoolBestRunnerUps(groups, 2, 2, gamesConfig);
    expect(best.map((r) => r.teamId)).toEqual(["b3", "c3"]);
  });

  it("returns empty when bestRunnerUpSlots is 0", () => {
    const groups = [
      makeGroup("g1", [
        {
          teamId: "a1",
          teamName: "A1",
          rank: 1,
          points: 9,
          wins: 3,
          played: 3,
          scoreFor: 10,
          scoreAgainst: 5,
          scoreDiff: 5,
        },
        {
          teamId: "a2",
          teamName: "A2",
          rank: 2,
          points: 3,
          wins: 1,
          played: 3,
          scoreFor: 8,
          scoreAgainst: 10,
          scoreDiff: -2,
        },
      ]),
    ];
    expect(computeCrossPoolBestRunnerUps(groups, 1, 0, gamesConfig)).toEqual([]);
  });

  it("marks best runners as qualified via applyBestRunnerUpQualification", () => {
    const groups = [
      makeGroup(
        "g1",
        [
          {
            teamId: "a1",
            teamName: "A1",
            rank: 1,
            points: 9,
            wins: 3,
            played: 3,
            scoreFor: 18,
            scoreAgainst: 6,
            scoreDiff: 12,
          },
          {
            teamId: "a2",
            teamName: "A2",
            rank: 2,
            points: 3,
            wins: 1,
            played: 3,
            scoreFor: 8,
            scoreAgainst: 14,
            scoreDiff: -6,
          },
        ],
        1,
      ),
      makeGroup(
        "g2",
        [
          {
            teamId: "b1",
            teamName: "B1",
            rank: 1,
            points: 9,
            wins: 3,
            played: 3,
            scoreFor: 18,
            scoreAgainst: 4,
            scoreDiff: 14,
          },
          {
            teamId: "b2",
            teamName: "B2",
            rank: 2,
            points: 6,
            wins: 2,
            played: 3,
            scoreFor: 14,
            scoreAgainst: 8,
            scoreDiff: 6,
          },
        ],
        1,
      ),
    ];
    // teamsAdvance=1 → runners rank 2: a2 (3pts), b2 (6pts); slots=1 → only b2
    applyBestRunnerUpQualification(groups, 1, 1, gamesConfig);
    expect(groups[0]!.standings.find((s) => s.teamId === "a1")!.qualificationStatus).toBe(
      "qualified",
    );
    expect(groups[0]!.standings.find((s) => s.teamId === "a2")!.qualificationStatus).toBe(
      "eliminated",
    );
    expect(groups[1]!.standings.find((s) => s.teamId === "b2")!.qualificationStatus).toBe(
      "qualified",
    );
  });
});

describe("buildQualifiedTeamsFromStandings with bestRunnerUpSlots", () => {
  it("includes best runners even if status was not yet flipped", () => {
    const groups = [
      {
        id: "g1",
        name: "G1",
        standings: [
          {
            teamId: "a1",
            teamName: "A1",
            rank: 1,
            points: 9,
            wins: 3,
            scoreDiff: 10,
            scoreFor: 18,
            qualificationStatus: "qualified",
          },
          {
            teamId: "a2",
            teamName: "A2",
            rank: 2,
            points: 3,
            wins: 1,
            scoreDiff: -4,
            scoreFor: 8,
            played: 3,
            scoreAgainst: 12,
            losses: 2,
            draws: 0,
            qualificationStatus: "eliminated",
          },
        ],
      },
      {
        id: "g2",
        name: "G2",
        standings: [
          {
            teamId: "b1",
            teamName: "B1",
            rank: 1,
            points: 9,
            wins: 3,
            scoreDiff: 12,
            scoreFor: 18,
            qualificationStatus: "qualified",
          },
          {
            teamId: "b2",
            teamName: "B2",
            rank: 2,
            points: 6,
            wins: 2,
            scoreDiff: 4,
            scoreFor: 14,
            played: 3,
            scoreAgainst: 10,
            losses: 1,
            draws: 0,
            qualificationStatus: "eliminated",
          },
        ],
      },
    ];

    // Standings rows for cross-pool need played/scoreAgainst — extend type via cast
    const withExtras = groups.map((g) => ({
      ...g,
      standings: g.standings.map((s) => ({
        played: 3,
        scoreAgainst: Math.max(0, s.scoreFor - s.scoreDiff),
        losses: 3 - s.wins,
        draws: 0,
        ...s,
      })),
    }));

    const qualified = buildQualifiedTeamsFromStandings(withExtras, {
      teamsAdvancePerGroup: 1,
      bestRunnerUpSlots: 1,
      scoringConfig: gamesConfig,
    });
    const ids = qualified.map((q) => q.teamId).sort();
    expect(ids).toEqual(["a1", "b1", "b2"]);
  });
});
