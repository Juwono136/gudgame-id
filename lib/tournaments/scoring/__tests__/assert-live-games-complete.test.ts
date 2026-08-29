import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertOfficialLiveGamesMatchComplete } from "@/lib/tournaments/scoring/assert-live-games-complete";
import { composeDoubleStageMatchScoring } from "@/lib/tournaments/match-config";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stub(settings: Record<string, unknown>): TournamentDetail {
  return {
    id: "t1",
    name: "Assert",
    slug: "assert",
    sportSlug: "padel",
    status: "live",
    tournamentType: "official",
    format: "double_stage",
    settings,
  } as TournamentDetail;
}

describe("assertOfficialLiveGamesMatchComplete", () => {
  it("rejects incomplete Total 4 group scores", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: composeDoubleStageMatchScoring(
        { mode: "total", totalSets: 4 },
        { mode: "race_to", raceTo: { value: 6 } },
      ),
    });
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "group", { scoreA: 1, scoreB: 2 }),
    ).toThrow(AppError);
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "group", { scoreA: 1, scoreB: 3 }),
    ).not.toThrow();
  });

  it("rejects incomplete Race to 6 knockout scores", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: composeDoubleStageMatchScoring(
        { mode: "total", totalSets: 4 },
        { mode: "race_to", raceTo: { value: 6 } },
      ),
    });
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "knockout", { scoreA: 4, scoreB: 2 }),
    ).toThrow(AppError);
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "knockout", { scoreA: 6, scoreB: 2 }),
    ).not.toThrow();
  });

  it("skips gate for custom_score points mode", () => {
    const t = stub({
      matchScoring: {
        mode: "custom_score",
        customScore: {
          variant: "one_match_winner",
          allowDraw: false,
          tiePolicy: "continue",
        },
      },
    });
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "default", { scoreA: 1, scoreB: 0 }),
    ).not.toThrow();
  });

  it("skips gate in paper score entry mode", () => {
    const t = stub({
      matchScoreMode: "games",
      scoreEntryMode: "paper",
      matchScoring: { mode: "race_to", raceTo: { value: 4 } },
    });
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "group", { scoreA: 1, scoreB: 0 }),
    ).not.toThrow();
  });

  it("Bestie SF/Final rejects 6–5 when round context uses late KO rules", () => {
    const t = {
      ...stub({
        matchScoreMode: "games",
        poolRules: "bestie_cup",
        matchScoring: composeDoubleStageMatchScoring(
          { mode: "race_to", raceTo: { value: 6 } },
          { mode: "race_to", raceTo: { value: 6 } },
        ),
        doubleStage: {
          phase: "knockout",
          maxTeamsPerGroup: 3,
          teamsAdvancePerGroup: 1,
          bestRunnerUpSlots: 0,
          thirdPlaceEnabled: false,
        },
      }),
      tournamentType: "fun_match",
    } as TournamentDetail;

    // Without round context → early KO fallback → 6–5 accepted.
    expect(() =>
      assertOfficialLiveGamesMatchComplete(t, "knockout", { scoreA: 6, scoreB: 5 }),
    ).not.toThrow();

    // SF (round 3 of 4) → win-by-2 → 6–5 rejected.
    expect(() =>
      assertOfficialLiveGamesMatchComplete(
        t,
        "knockout",
        { scoreA: 6, scoreB: 5 },
        { knockoutRoundNumber: 3, knockoutTotalRounds: 4 },
      ),
    ).toThrow(AppError);

    expect(() =>
      assertOfficialLiveGamesMatchComplete(
        t,
        "knockout",
        { scoreA: 6, scoreB: 4 },
        { knockoutRoundNumber: 3, knockoutTotalRounds: 4 },
      ),
    ).not.toThrow();

    // R16 (round 1) still allows 6–5.
    expect(() =>
      assertOfficialLiveGamesMatchComplete(
        t,
        "knockout",
        { scoreA: 6, scoreB: 5 },
        { knockoutRoundNumber: 1, knockoutTotalRounds: 4 },
      ),
    ).not.toThrow();
  });
});
