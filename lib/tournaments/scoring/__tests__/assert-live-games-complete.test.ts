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
});
