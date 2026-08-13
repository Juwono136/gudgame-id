import { describe, expect, it } from "vitest";
import {
  getTournamentMatchScoreMode,
  getTournamentRaceToTarget,
  getTournamentMatchScoringHint,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stubTournament(
  settings: Record<string, unknown>,
  overrides: Partial<TournamentDetail> = {},
): TournamentDetail {
  return {
    id: "t1",
    name: "Test",
    slug: "test",
    sportSlug: "padel",
    status: "upcoming",
    tournamentType: "official",
    format: "double_stage",
    settings,
    ...overrides,
  } as TournamentDetail;
}

describe("match scoring resolve (create → runtime)", () => {
  it("keeps Fun Match / points tournaments in points mode when matchScoring is only derived", () => {
    const t = stubTournament({
      pointsPerMatch: 21,
      scoringType: "points",
    });
    expect(getTournamentMatchScoreMode(t)).toBe("points");
    expect(getTournamentMatchScoringHint(t)).toContain("21");
  });

  it("uses stored Official race_to (including custom 8) for games mode", () => {
    const t = stubTournament({
      matchScoreMode: "games",
      matchScoring: { mode: "race_to", raceTo: { value: 8 } },
      pointsPerMatch: 21,
    });
    expect(getTournamentMatchScoreMode(t)).toBe("games");
    expect(getTournamentRaceToTarget(t)).toBe(8);
    expect(getTournamentMatchScoringHint(t)).toBe("Race to 8");
  });

  it("prefers explicit matchScoreMode=points over derived race_to dual-read", () => {
    const t = stubTournament({
      matchScoreMode: "points",
      pointsPerMatch: 15,
      // Would look like games if derived blindly:
      matchScoring: undefined,
    });
    expect(getTournamentMatchScoreMode(t)).toBe("points");
    expect(getTournamentRaceToTarget(t)).toBe(4);
  });

  it("maps best_of stored scoring to games mode", () => {
    const t = stubTournament({
      matchScoring: { mode: "best_of", bestOf: 3, setTarget: { value: 6 } },
    });
    expect(getTournamentMatchScoreMode(t)).toBe("games");
  });
});
