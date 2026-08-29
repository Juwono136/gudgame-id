import { describe, expect, it } from "vitest";
import {
  hasDistinctRaceToByRound,
  knockoutRoundKeyFromBracket,
  knockoutRoundKeysForTeamCount,
  normalizeMatchScoringLeaf,
  parseMatchScoringConfig,
  resolveRaceToForKnockoutRound,
  summarizeMatchScoringLeaf,
} from "@/lib/tournaments/match-config";
import { getTournamentGameRules, getTournamentRaceToTarget } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stubTournament(settings: Record<string, unknown>): TournamentDetail {
  return {
    id: "t1",
    name: "KO",
    slug: "ko",
    sportSlug: "padel",
    status: "live",
    tournamentType: "fun_match",
    format: "single_elimination",
    settings,
  } as TournamentDetail;
}

describe("raceToByRound helpers", () => {
  it("maps bracket round numbers via distance-from-final", () => {
    // 5-round bracket (32 teams): round 1 = R32, round 5 = Final
    expect(knockoutRoundKeyFromBracket(1, 5)).toBe("r32");
    expect(knockoutRoundKeyFromBracket(2, 5)).toBe("r16");
    expect(knockoutRoundKeyFromBracket(3, 5)).toBe("qf");
    expect(knockoutRoundKeyFromBracket(4, 5)).toBe("sf");
    expect(knockoutRoundKeyFromBracket(5, 5)).toBe("final");
  });

  it("lists round keys for field size", () => {
    expect(knockoutRoundKeysForTeamCount(32)).toEqual([
      "r32",
      "r16",
      "qf",
      "sf",
      "final",
    ]);
    expect(knockoutRoundKeysForTeamCount(16)).toEqual(["r16", "qf", "sf", "final"]);
    expect(knockoutRoundKeysForTeamCount(8)).toEqual(["qf", "sf", "final"]);
  });

  it("resolves race-to with per-round overrides", () => {
    const leaf = normalizeMatchScoringLeaf({
      mode: "race_to",
      raceTo: { value: 4 },
      raceToByRound: { r32: 4, r16: 4, qf: 6, sf: 6, final: 8 },
    });
    expect(resolveRaceToForKnockoutRound(leaf, "r32")).toBe(4);
    expect(resolveRaceToForKnockoutRound(leaf, "qf")).toBe(6);
    expect(resolveRaceToForKnockoutRound(leaf, "final")).toBe(8);
    expect(hasDistinctRaceToByRound(leaf)).toBe(true);
    expect(summarizeMatchScoringLeaf(leaf)).toContain("by round");
  });

  it("parses raceToByRound from stored matchScoring", () => {
    const parsed = parseMatchScoringConfig({
      mode: "race_to",
      raceTo: { value: 4 },
      raceToByRound: { qf: 6, final: 8 },
    });
    expect(parsed?.raceToByRound).toEqual({ qf: 6, final: 8 });
  });
});

describe("getTournamentRaceToTarget with raceToByRound", () => {
  const t = stubTournament({
    matchScoreMode: "games",
    matchScoring: {
      mode: "race_to",
      raceTo: { value: 4 },
      raceToByRound: { r32: 4, r16: 4, qf: 6, sf: 6, final: 8 },
    },
  });

  it("uses round context for knockout races", () => {
    expect(
      getTournamentRaceToTarget(t, "knockout", {
        knockoutRoundNumber: 1,
        knockoutTotalRounds: 5,
      }),
    ).toBe(4);
    expect(
      getTournamentRaceToTarget(t, "knockout", {
        knockoutRoundNumber: 3,
        knockoutTotalRounds: 5,
      }),
    ).toBe(6);
    expect(
      getTournamentRaceToTarget(t, "knockout", {
        knockoutRoundNumber: 5,
        knockoutTotalRounds: 5,
      }),
    ).toBe(8);
  });

  it("falls back to default raceTo without context", () => {
    expect(getTournamentRaceToTarget(t, "knockout")).toBe(4);
  });

  it("wires into getTournamentGameRules", () => {
    expect(
      getTournamentGameRules(t, "knockout", {
        knockoutRoundNumber: 5,
        knockoutTotalRounds: 5,
      }).raceToGames,
    ).toBe(8);
  });
});
