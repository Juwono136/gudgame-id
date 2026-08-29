import { describe, expect, it } from "vitest";
import {
  computeGroupStandings,
  type CompletedGroupMatch,
} from "@/lib/tournaments/double-stage/standings";
import {
  BESTIE_CUP_KO_EARLY_GAME_RULES,
  BESTIE_CUP_KO_LATE_GAME_RULES,
  BESTIE_CUP_POOL_GAME_RULES,
  BESTIE_CUP_POOL_STANDINGS,
  formatGameWinPctDisplay,
  getBestieCupKnockoutGameRules,
} from "@/lib/tournaments/partner/bestie-cup-config";
import { getTournamentGameRules } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

function completed(
  a: string,
  b: string,
  scoreA: number,
  scoreB: number,
): CompletedGroupMatch {
  return { teamAId: a, teamBId: b, scoreA, scoreB, status: "completed" };
}

describe("Bestie Cup 3-team pool simulation", () => {
  const teams = [
    { id: "a", name: "Team A" },
    { id: "b", name: "Team B" },
    { id: "c", name: "Team C" },
  ];

  it("ranks 1-1-1 pools by game win % (B > A > C)", () => {
    const matches = [
      completed("a", "b", 6, 4),
      completed("b", "c", 6, 3),
      completed("c", "a", 6, 5),
    ];

    const standings = computeGroupStandings(teams, matches, BESTIE_CUP_POOL_STANDINGS, 1, {
      lockQualification: true,
    });

    expect(standings.map((s) => s.teamId)).toEqual(["b", "a", "c"]);
    expect(standings[0]!.wins).toBe(1);
    expect(standings[0]!.losses).toBe(1);
    expect(standings[0]!.gameWinPct).toBeCloseTo(52.63, 1);
    expect(standings[1]!.gameWinPct).toBeCloseTo(52.38, 1);
    expect(standings[2]!.gameWinPct).toBeCloseTo(45, 1);
    expect(standings[0]!.qualificationStatus).toBe("qualified");
    expect(standings[1]!.qualificationStatus).toBe("eliminated");
  });

  it("formats game win % for display", () => {
    expect(
      formatGameWinPctDisplay({ gamesFor: 10, gamesAgainst: 9, scoreFor: 0, scoreAgainst: 0 }),
    ).toBe("52.63");
    expect(
      formatGameWinPctDisplay({ gamesFor: 11, gamesAgainst: 10, scoreFor: 0, scoreAgainst: 0 }),
    ).toBe("52.38");
    expect(
      formatGameWinPctDisplay({ gamesFor: 9, gamesAgainst: 11, scoreFor: 0, scoreAgainst: 0 }),
    ).toBe("45.00");
  });
});

describe("Bestie Cup game rules (double stage)", () => {
  function stub(phase: "group" | "knockout"): TournamentDetail {
    return {
      id: "bc1",
      name: "Bestie Cup",
      slug: "bestie-cup",
      format: "double_stage",
      sportSlug: "padel",
      status: "live",
      tournamentType: "fun_match",
      settings: {
        poolRules: "bestie_cup",
        doubleStage: { phase, advancePerGroup: 1, pairsPerGroup: 3 },
        matchScoring: {
          mode: "race_to",
          raceTo: { value: 6 },
          group: { mode: "race_to", raceTo: { value: 6 } },
          knockout: { mode: "race_to", raceTo: { value: 6 } },
        },
      },
    } as unknown as TournamentDetail;
  }

  it("uses pool rules when double stage is in group phase (even with default stage)", () => {
    const rules = getTournamentGameRules(stub("group"), "default");
    expect(rules.raceToGames).toBe(BESTIE_CUP_POOL_GAME_RULES.raceToGames);
    expect(rules.sideChangeOnOddGameTotal).toBe(true);
  });

  it("uses knockout rules when double stage is in knockout phase (default stage)", () => {
    const rules = getTournamentGameRules(stub("knockout"), "default", {
      knockoutRoundNumber: 1,
      knockoutTotalRounds: 4,
    });
    expect(rules.matchTiebreakAt).toBe(BESTIE_CUP_KO_EARLY_GAME_RULES.matchTiebreakAt);
    expect(rules.matchWinMargin).toBe(1);
    expect(rules.matchTiebreakTo).toBe(7);
    expect(rules.gameDecider).toBe("golden_point");
  });

  it("applies SF/Final win-by-2 + TB at 6–6 (PDF late rounds)", () => {
    const sf = getBestieCupKnockoutGameRules(3, 4);
    const final = getBestieCupKnockoutGameRules(4, 4);
    const qf = getBestieCupKnockoutGameRules(2, 4);
    expect(sf).toMatchObject({
      matchWinMargin: BESTIE_CUP_KO_LATE_GAME_RULES.matchWinMargin,
      matchTiebreakAt: BESTIE_CUP_KO_LATE_GAME_RULES.matchTiebreakAt,
      matchTiebreakTo: 7,
      raceToGames: 6,
    });
    expect(final.matchTiebreakAt).toBe(6);
    expect(qf.matchTiebreakAt).toBe(5);
    expect(qf.matchWinMargin).toBe(1);

    const liveSf = getTournamentGameRules(stub("knockout"), "knockout", {
      knockoutRoundNumber: 3,
      knockoutTotalRounds: 4,
    });
    expect(liveSf.matchWinMargin).toBe(2);
    expect(liveSf.matchTiebreakAt).toBe(6);
  });
});
