import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOUBLE_STAGE_SETTINGS,
  parseDoubleStageSettings,
} from "@/lib/tournaments/scoring/config";

describe("parseDoubleStageSettings", () => {
  it("reads nested doubleStage fields", () => {
    expect(
      parseDoubleStageSettings({
        maxTeamsPerGroup: 3,
        teamsAdvancePerGroup: 1,
        bestRunnerUpSlots: 0,
        phase: "group",
      }),
    ).toMatchObject({
      maxTeamsPerGroup: 3,
      teamsAdvancePerGroup: 1,
      bestRunnerUpSlots: 0,
      phase: "group",
    });
  });

  it("unwraps full tournament settings blob (common UI mistake)", () => {
    expect(
      parseDoubleStageSettings({
        courtCount: 2,
        matchScoreMode: "games",
        doubleStage: {
          phase: "group",
          maxTeamsPerGroup: 3,
          teamsAdvancePerGroup: 1,
          bestRunnerUpSlots: 0,
          thirdPlaceEnabled: false,
        },
      }),
    ).toMatchObject({
      maxTeamsPerGroup: 3,
      teamsAdvancePerGroup: 1,
      phase: "group",
    });
  });

  it("coerces string numbers from legacy JSON", () => {
    expect(
      parseDoubleStageSettings({
        maxTeamsPerGroup: "5",
        teamsAdvancePerGroup: "2",
        bestRunnerUpSlots: "1",
      }),
    ).toMatchObject({
      maxTeamsPerGroup: 5,
      teamsAdvancePerGroup: 2,
      bestRunnerUpSlots: 1,
    });
  });

  it("falls back to defaults when empty", () => {
    expect(parseDoubleStageSettings(null)).toEqual({
      ...DEFAULT_DOUBLE_STAGE_SETTINGS,
    });
    expect(parseDoubleStageSettings({})).toMatchObject({
      maxTeamsPerGroup: DEFAULT_DOUBLE_STAGE_SETTINGS.maxTeamsPerGroup,
      teamsAdvancePerGroup: DEFAULT_DOUBLE_STAGE_SETTINGS.teamsAdvancePerGroup,
    });
  });
});
