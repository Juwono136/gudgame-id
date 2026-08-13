/**
 * Full matrix: Official formats × match scoring modes × live completion paths.
 * Pure / unit — no DB.
 */
import { describe, expect, it } from "vitest";
import {
  OFFICIAL_CREATABLE_FORMATS,
  composeDoubleStageMatchScoring,
  formatHasGroupStage,
  formatHasKnockout,
  formatHasLobbyRounds,
  matchScoreModeFromScoring,
  matchScoringLeafFromMode,
  resolveMatchScoringForStage,
  summarizeMatchScoringLeaf,
  type MatchScoringMode,
  type OfficialCreatableFormat,
} from "@/lib/tournaments/match-config";
import {
  getTournamentClassicSetRules,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  isClassicSetsFormat,
} from "@/lib/tournaments/settings";
import {
  formatGamesMatchLengthLabel,
  isRaceToGamesMatchComplete,
} from "@/lib/tournaments/scoring/game-mode";
import {
  isClassicMatchComplete,
  setsNeededToWinMatch,
} from "@/lib/tournaments/scoring/classic-sets";
import { resolveMatchScoring } from "@/lib/tournaments/scoring/match-scoring";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import type { TournamentDetail } from "@/lib/tournaments/service";

const MODES: MatchScoringMode[] = ["best_of", "race_to", "total", "custom_score"];

function stub(
  format: OfficialCreatableFormat,
  settings: Record<string, unknown>,
): TournamentDetail {
  return {
    id: "matrix-t",
    name: "Matrix",
    slug: "matrix",
    sportSlug: "padel",
    status: "live",
    tournamentType: "official",
    format,
    settings,
    playersPerTeam: 2,
    maxTeams: 16,
  } as TournamentDetail;
}

function baseUpsert(
  format: OfficialCreatableFormat,
  matchScoring: Record<string, unknown>,
  extras: Record<string, unknown> = {},
) {
  const startsAt = new Date("2026-08-13T02:00:00.000Z").toISOString();
  const endsAt = new Date("2026-08-21T02:00:00.000Z").toISOString();
  return {
    name: `Matrix ${format}`,
    slug: `matrix-${format.replace(/_/g, "-")}`,
    status: "upcoming" as const,
    tournamentType: "official" as const,
    officialBilling: "free" as const,
    registrationFeeIdr: 0,
    categoryLabel: "Mix" as const,
    format,
    formatFamily: format === "mexicano" ? ("original" as const) : ("custom" as const),
    rankingMode: "open" as const,
    matchScoring,
    venue: "GBK",
    startsAt,
    endsAt,
    scoringType: "points" as const,
    pointsPerMatch: 21,
    courtCount: 2,
    playersPerTeam: 2,
    maxTeams: 16,
    ...extras,
  };
}

describe("official format × scoring mode matrix · create validation", () => {
  it.each(OFFICIAL_CREATABLE_FORMATS)(
    "accepts every scoring mode for %s",
    (format) => {
      for (const mode of MODES) {
        const leaf = matchScoringLeafFromMode(mode);
        const extras: Record<string, unknown> =
          format === "double_stage"
            ? {
                maxTeamsPerGroup: 4,
                teamsAdvancePerGroup: 2,
                customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
                matchScoring: composeDoubleStageMatchScoring(leaf, leaf),
              }
            : format === "group_only"
              ? {
                  maxTeamsPerGroup: 4,
                  customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
                  matchScoring: leaf,
                }
              : format === "mexicano"
                ? {
                    mexicano: { mode: "team", roundCount: 5 },
                    maxRounds: 5,
                    matchScoring: leaf,
                  }
                : format === "single_elimination"
                  ? {
                      customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
                      matchScoring: leaf,
                    }
                  : { matchScoring: leaf };

        const parsed = tournamentUpsertSchema.safeParse(
          baseUpsert(format, leaf as never, extras),
        );
        expect(
          parsed.success,
          `${format}/${mode}: ${JSON.stringify(parsed.error?.issues)}`,
        ).toBe(true);
      }
    },
  );
});

describe("official format × scoring mode matrix · runtime path", () => {
  it.each(OFFICIAL_CREATABLE_FORMATS)(
    "resolves entry mode + capabilities for %s",
    (format) => {
      for (const mode of MODES) {
        const leaf = matchScoringLeafFromMode(mode);
        const settings =
          format === "double_stage"
            ? {
                matchScoring: composeDoubleStageMatchScoring(leaf, leaf),
                doubleStage: { phase: "group" },
              }
            : { matchScoring: leaf };
        const t = stub(format, settings);
        const stage = formatHasKnockout(format) && !formatHasGroupStage(format)
          ? "knockout"
          : formatHasGroupStage(format)
            ? "group"
            : "default";

        expect(getTournamentMatchScoreMode(t, stage)).toBe(
          matchScoreModeFromScoring(leaf),
        );
        expect(isClassicSetsFormat(t, stage)).toBe(mode === "best_of");

        const caps = getFormatCapabilities(t);
        if (formatHasLobbyRounds(format)) {
          expect(caps.manageScoringMode).toBe("rounds");
        } else if (formatHasGroupStage(format) && format !== "double_stage") {
          expect(caps.manageScoringMode).toBe("groups");
        } else if (format === "single_elimination") {
          expect(caps.manageScoringMode).toBe("bracket");
        }
      }
    },
  );
});

describe("live completion semantics per scoring mode", () => {
  it("race_to: first to N exactly", () => {
    const t = stub("double_stage", {
      matchScoring: composeDoubleStageMatchScoring(
        { mode: "race_to", raceTo: { value: 4 } },
        { mode: "race_to", raceTo: { value: 6 } },
      ),
    });
    const group = getTournamentGameRules(t, "group");
    const ko = getTournamentGameRules(t, "knockout");
    expect(group.lengthMode).toBe("race_to");
    expect(formatGamesMatchLengthLabel(group)).toBe("Race to 4");
    expect(isRaceToGamesMatchComplete(4, 2, group).complete).toBe(true);
    expect(isRaceToGamesMatchComplete(3, 2, group).complete).toBe(false);
    expect(isRaceToGamesMatchComplete(1, 3, group).complete).toBe(false);
    expect(isRaceToGamesMatchComplete(6, 1, ko).complete).toBe(true);
    expect(isRaceToGamesMatchComplete(4, 2, ko).complete).toBe(false);
  });

  it("total: exactly N games played (1–3 finishes Total 4)", () => {
    const t = stub("group_only", {
      matchScoring: { mode: "total", totalSets: 4 },
    });
    const rules = getTournamentGameRules(t, "group");
    expect(rules.lengthMode).toBe("total");
    expect(formatGamesMatchLengthLabel(rules)).toBe("Total 4");
    expect(isRaceToGamesMatchComplete(1, 3, rules)).toEqual({
      complete: true,
      winner: "b",
    });
    expect(isRaceToGamesMatchComplete(1, 2, rules).complete).toBe(false);
    expect(isRaceToGamesMatchComplete(2, 2, rules)).toEqual({
      complete: true,
      winner: null,
    });
  });

  it("best_of: classic sets path (first to majority of sets)", () => {
    const t = stub("single_elimination", {
      matchScoring: {
        mode: "best_of",
        bestOf: 3,
        setTarget: { value: 6 },
      },
    });
    expect(isClassicSetsFormat(t, "knockout")).toBe(true);
    const setRules = getTournamentClassicSetRules(t, "knockout");
    expect(setRules.bestOfSets).toBe(3);
    expect(setRules.gamesToWinSet).toBe(6);
    expect(setsNeededToWinMatch(setRules.bestOfSets)).toBe(2);
    expect(isClassicMatchComplete(2, 0, setRules).complete).toBe(true);
    expect(isClassicMatchComplete(1, 0, setRules).complete).toBe(false);
  });

  it("custom_score: points entry + host-complete large_score", () => {
    const t = stub("americano", {
      matchScoring: {
        mode: "custom_score",
        customScore: {
          variant: "large_score",
          allowDraw: false,
          tiePolicy: "host_manual",
        },
      },
    });
    expect(getTournamentMatchScoreMode(t)).toBe("points");
    expect(
      resolveMatchScoring({
        config: {
          mode: "custom_score",
          customScore: {
            variant: "large_score",
            allowDraw: false,
            tiePolicy: "host_manual",
          },
        },
        sideA: { points: 40 },
        sideB: { points: 22 },
      }).status,
    ).toBe("incomplete");
    expect(
      resolveMatchScoring({
        config: {
          mode: "custom_score",
          customScore: {
            variant: "large_score",
            allowDraw: false,
            tiePolicy: "host_manual",
          },
        },
        sideA: { points: 40 },
        sideB: { points: 22 },
        hostMarkedComplete: true,
      }),
    ).toMatchObject({ status: "complete", winner: "a" });
  });
});

describe("double stage mixed modes stay isolated (group ≠ knockout)", () => {
  const pairs: Array<[MatchScoringMode, MatchScoringMode]> = [
    ["total", "race_to"],
    ["race_to", "best_of"],
    ["best_of", "total"],
    ["custom_score", "race_to"],
    ["total", "total"],
    ["race_to", "custom_score"],
  ];

  it.each(pairs)("group %s · KO %s", (groupMode, koMode) => {
    const group = matchScoringLeafFromMode(groupMode);
    const knockout = matchScoringLeafFromMode(koMode);
    if (groupMode === "total") group.totalSets = 4;
    if (koMode === "race_to") knockout.raceTo = { value: 6 };
    if (koMode === "total") knockout.totalSets = 4;

    const config = composeDoubleStageMatchScoring(group, knockout);
    const t = stub("double_stage", { matchScoring: config, matchScoreMode: "games" });

    expect(resolveMatchScoringForStage(config, "group")?.mode).toBe(groupMode);
    expect(resolveMatchScoringForStage(config, "knockout")?.mode).toBe(koMode);
    expect(getTournamentMatchScoreMode(t, "group")).toBe(
      matchScoreModeFromScoring(group),
    );
    expect(getTournamentMatchScoreMode(t, "knockout")).toBe(
      matchScoreModeFromScoring(knockout),
    );
    expect(isClassicSetsFormat(t, "group")).toBe(groupMode === "best_of");
    expect(isClassicSetsFormat(t, "knockout")).toBe(koMode === "best_of");

    if (groupMode === "total") {
      const rules = getTournamentGameRules(t, "group");
      expect(rules.lengthMode).toBe("total");
      expect(isRaceToGamesMatchComplete(1, 3, rules).complete).toBe(true);
    }
    if (koMode === "race_to") {
      const rules = getTournamentGameRules(t, "knockout");
      expect(rules.lengthMode).toBe("race_to");
      expect(isRaceToGamesMatchComplete(1, 3, rules).complete).toBe(false);
      expect(isRaceToGamesMatchComplete(6, 2, rules).complete).toBe(true);
    }

    expect(summarizeMatchScoringLeaf(group).length).toBeGreaterThan(0);
    expect(summarizeMatchScoringLeaf(knockout).length).toBeGreaterThan(0);
  });
});

describe("fun match isolation", () => {
  it("does not flip Fun Match points via Official matchScoring helpers", () => {
    const t = {
      ...stub("americano", {
        scoringType: "points",
        pointsPerMatch: 21,
      }),
      tournamentType: "fun_match",
    } as TournamentDetail;
    expect(getTournamentMatchScoreMode(t)).toBe("points");
    expect(isClassicSetsFormat(t)).toBe(false);
  });
});
