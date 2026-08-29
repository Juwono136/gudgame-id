import { describe, expect, it } from "vitest";
import {
  composeDoubleStageMatchScoring,
  deriveMatchScoringFromLegacy,
  ensureDoubleStageScoringLeaves,
  matchScoreModeFromScoring,
  matchScoringForFormat,
  matchScoringLeafFromMode,
  parseMatchScoringConfig,
  raceToValueForStage,
  resolveMatchScoringForStage,
  summarizeMatchScoring,
  summarizeMatchScoringLeaf,
  type MatchScoringMode,
} from "@/lib/tournaments/match-config";
import {
  buildTournamentSettings,
  getTournamentClassicSetRules,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentMatchScoringHint,
  getTournamentRaceToTarget,
  isClassicSetsFormat,
  parseTournamentSettings,
  settingsInputFromUpsert,
} from "@/lib/tournaments/settings";
import { isRaceToGamesMatchComplete } from "@/lib/tournaments/scoring/game-mode";
import { resolveMatchScoring } from "@/lib/tournaments/scoring/match-scoring";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stub(settings: Record<string, unknown>): TournamentDetail {
  return {
    id: "t1",
    name: "Stage scoring",
    slug: "stage-scoring",
    sportSlug: "padel",
    status: "live",
    tournamentType: "official",
    format: "double_stage",
    settings,
  } as TournamentDetail;
}

const MODES: MatchScoringMode[] = ["best_of", "race_to", "total", "custom_score"];

describe("stage-specific match scoring (full mode per stage)", () => {
  it("resolves different race-to targets per stage from matchScoring", () => {
    const config = parseMatchScoringConfig({
      mode: "race_to",
      raceTo: { value: 4 },
      group: { mode: "race_to", raceTo: { value: 4 } },
      knockout: { mode: "race_to", raceTo: { value: 6 } },
    });
    expect(raceToValueForStage(config, "group")).toBe(4);
    expect(raceToValueForStage(config, "knockout")).toBe(6);
    expect(summarizeMatchScoring(config)).toBe(
      "Group: Race to 4 · KO: Race to 6",
    );
  });

  it("allows independent scoring modes for group vs knockout", () => {
    const config = composeDoubleStageMatchScoring(
      { mode: "race_to", raceTo: { value: 4 } },
      { mode: "best_of", bestOf: 3, setTarget: { value: 6 } },
    );
    const group = resolveMatchScoringForStage(config, "group");
    const ko = resolveMatchScoringForStage(config, "knockout");
    expect(group?.mode).toBe("race_to");
    expect(group?.raceTo?.value).toBe(4);
    expect(ko?.mode).toBe("best_of");
    expect(ko?.bestOf).toBe(3);
    expect(ko?.raceTo).toBeUndefined();
    expect(summarizeMatchScoring(config)).toContain("Group: Race to 4");
    expect(summarizeMatchScoring(config)).toContain("KO: Best of 3");
  });

  it.each(MODES)("compose + resolve keeps %s leaf clean (no stale fields)", (mode) => {
    const leaf = matchScoringLeafFromMode(mode);
    const other = matchScoringLeafFromMode(
      mode === "race_to" ? "best_of" : "race_to",
    );
    const config = composeDoubleStageMatchScoring(leaf, other);
    const resolved = resolveMatchScoringForStage(config, "group");
    expect(resolved?.mode).toBe(mode);
    if (mode === "race_to") {
      expect(resolved?.bestOf).toBeUndefined();
      expect(resolved?.customScore).toBeUndefined();
    }
    if (mode === "best_of") {
      expect(resolved?.raceTo).toBeUndefined();
    }
    if (mode === "custom_score") {
      expect(resolved?.raceTo).toBeUndefined();
      expect(resolved?.bestOf).toBeUndefined();
    }
  });

  it("drives live game rules / classic / points mode from stage leaves", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: composeDoubleStageMatchScoring(
        { mode: "race_to", raceTo: { value: 4 } },
        { mode: "best_of", bestOf: 3, setTarget: { value: 6 } },
      ),
    });
    expect(getTournamentMatchScoreMode(t, "group")).toBe("games");
    expect(getTournamentMatchScoreMode(t, "knockout")).toBe("games");
    expect(isClassicSetsFormat(t, "group")).toBe(false);
    expect(isClassicSetsFormat(t, "knockout")).toBe(true);
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(getTournamentGameRules(t, "group").raceToGames).toBe(4);
    expect(getTournamentClassicSetRules(t, "knockout").bestOfSets).toBe(3);
    expect(getTournamentClassicSetRules(t, "knockout").gamesToWinSet).toBe(6);
  });

  it("maps custom_score stage to points entry mode", () => {
    const t = stub({
      matchScoring: composeDoubleStageMatchScoring(
        {
          mode: "custom_score",
          customScore: {
            variant: "large_score",
            allowDraw: false,
            tiePolicy: "host_manual",
          },
        },
        { mode: "race_to", raceTo: { value: 6 } },
      ),
    });
    expect(getTournamentMatchScoreMode(t, "group")).toBe("points");
    expect(getTournamentMatchScoreMode(t, "knockout")).toBe("games");
    expect(matchScoreModeFromScoring(resolveMatchScoringForStage(
      parseMatchScoringConfig(t.settings.matchScoring),
      "group",
    ))).toBe("points");
  });

  it("derives stage overrides from legacy raceToGamesGroup / Knockout", () => {
    const derived = deriveMatchScoringFromLegacy({
      matchScoreMode: "games",
      raceToGames: 4,
      raceToGamesGroup: 4,
      raceToGamesKnockout: 6,
    });
    expect(derived.group?.raceTo?.value).toBe(4);
    expect(derived.knockout?.raceTo?.value).toBe(6);
  });
});

describe("stage scoring · format isolation (no regression)", () => {
  it("strips stage leaves for non-double-stage formats", () => {
    const dual = composeDoubleStageMatchScoring(
      { mode: "race_to", raceTo: { value: 4 } },
      { mode: "best_of", bestOf: 5, setTarget: { value: 6 } },
    );
    const se = matchScoringForFormat(dual, "single_elimination");
    expect(se.group).toBeUndefined();
    expect(se.knockout).toBeUndefined();
    expect(se.mode).toBe("race_to");
    expect(se.raceTo?.value).toBe(4);
  });

  it("promotes knockout race-to + raceToByRound when switching to Elimination", () => {
    const dual = composeDoubleStageMatchScoring(
      { mode: "race_to", raceTo: { value: 4 } },
      {
        mode: "race_to",
        raceTo: { value: 6 },
        raceToByRound: { qf: 6, sf: 6, final: 8 },
      },
    );
    const se = matchScoringForFormat(dual, "single_elimination");
    expect(se.group).toBeUndefined();
    expect(se.knockout).toBeUndefined();
    expect(se.mode).toBe("race_to");
    expect(se.raceTo?.value).toBe(6);
    expect(se.raceToByRound).toEqual({ qf: 6, sf: 6, final: 8 });
  });

  it("seeds group race-to 4 / KO race-to 6 when entering Double Stage", () => {
    const seeded = ensureDoubleStageScoringLeaves({
      mode: "race_to",
      raceTo: { value: 4 },
    });
    expect(seeded.group?.mode).toBe("race_to");
    expect(seeded.group?.raceTo?.value).toBe(4);
    expect(seeded.knockout?.mode).toBe("race_to");
    expect(seeded.knockout?.raceTo?.value).toBe(6);
  });

  it("moves root raceToByRound onto knockout leaf (not group)", () => {
    const seeded = ensureDoubleStageScoringLeaves({
      mode: "race_to",
      raceTo: { value: 4 },
      raceToByRound: { r16: 4, final: 8 },
    });
    expect(seeded.group?.raceToByRound).toBeUndefined();
    expect(seeded.knockout?.raceToByRound).toEqual({ r16: 4, final: 8 });
    expect(seeded.knockout?.raceTo?.value).toBe(6);
  });

  it("clones non-race group mode into knockout when KO leaf missing", () => {
    const seeded = ensureDoubleStageScoringLeaves({
      mode: "best_of",
      bestOf: 3,
      setTarget: { value: 6 },
    });
    expect(seeded.group?.mode).toBe("best_of");
    expect(seeded.knockout?.mode).toBe("best_of");
    expect(seeded.knockout?.bestOf).toBe(3);
  });

  it("single race_to (no stage leaves) still works for all Official formats", () => {
    for (const format of [
      "single_elimination",
      "group_only",
      "americano",
      "mexicano",
      "double_stage",
    ] as const) {
      const t = {
        ...stub({
          matchScoreMode: "games",
          matchScoring: { mode: "race_to", raceTo: { value: 8 } },
        }),
        format,
      } as TournamentDetail;
      expect(getTournamentMatchScoreMode(t)).toBe("games");
      expect(getTournamentRaceToTarget(t)).toBe(8);
      expect(getTournamentGameRules(t).raceToGames).toBe(8);
    }
  });

  it("Fun Match points mode is never flipped by stage helpers", () => {
    const t = {
      ...stub({
        scoringType: "points",
        pointsPerMatch: 21,
      }),
      tournamentType: "fun_match",
      format: "americano",
    } as TournamentDetail;
    expect(getTournamentMatchScoreMode(t)).toBe("points");
  });

  it("walkover race targets follow match kind stage for race_to", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: composeDoubleStageMatchScoring(
        { mode: "race_to", raceTo: { value: 4 } },
        { mode: "race_to", raceTo: { value: 6 } },
      ),
    });
    expect(isRaceToGamesMatchComplete(4, 0, getTournamentGameRules(t, "group")).complete).toBe(
      true,
    );
    expect(isRaceToGamesMatchComplete(4, 0, getTournamentGameRules(t, "knockout")).complete).toBe(
      false,
    );
    expect(isRaceToGamesMatchComplete(6, 0, getTournamentGameRules(t, "knockout")).complete).toBe(
      true,
    );
  });
});

describe("stage scoring · all mode matrix (resolve + upsert)", () => {
  const matrix: Array<{
    group: ReturnType<typeof matchScoringLeafFromMode>;
    knockout: ReturnType<typeof matchScoringLeafFromMode>;
  }> = [];
  for (const g of MODES) {
    for (const k of MODES) {
      matrix.push({
        group: matchScoringLeafFromMode(g),
        knockout: matchScoringLeafFromMode(k),
      });
    }
  }

  it.each(matrix)(
    "group $group.mode + KO $knockout.mode resolves and validates",
    ({ group, knockout }) => {
      const config = composeDoubleStageMatchScoring(group, knockout);
      expect(resolveMatchScoringForStage(config, "group")?.mode).toBe(group.mode);
      expect(resolveMatchScoringForStage(config, "knockout")?.mode).toBe(knockout.mode);
      expect(summarizeMatchScoringLeaf(group).length).toBeGreaterThan(0);

      const startsAt = new Date("2026-08-13T02:00:00.000Z").toISOString();
      const endsAt = new Date("2026-08-21T02:00:00.000Z").toISOString();
      const parsed = tournamentUpsertSchema.safeParse({
        name: "DS Matrix",
        slug: `ds-${group.mode.replace(/_/g, "-")}-${knockout.mode.replace(/_/g, "-")}`,
        status: "upcoming",
        tournamentType: "official",
        officialBilling: "free",
        registrationFeeIdr: 0,
        categoryLabel: "Mix",
        format: "double_stage",
        formatFamily: "custom",
        rankingMode: "tiered",
        allowedTierLevels: ["bronze"],
        matchScoring: config,
        customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
        maxTeamsPerGroup: 4,
        teamsAdvancePerGroup: 2,
        venue: "GBK SENAYAN",
        startsAt,
        endsAt,
        scoringType: "points",
        pointsPerMatch: 21,
        courtCount: 2,
        playersPerTeam: 2,
        maxTeams: 16,
      });
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

      const t = stub({ matchScoring: config });
      expect(getTournamentMatchScoreMode(t, "group")).toBe(
        matchScoreModeFromScoring(group),
      );
      expect(getTournamentMatchScoreMode(t, "knockout")).toBe(
        matchScoreModeFromScoring(knockout),
      );
    },
  );

  it("best_of and race_to resolveMatchScoring complete correctly per stage config", () => {
    expect(
      resolveMatchScoring({
        config: { mode: "best_of", bestOf: 3, setTarget: { value: 6 } },
        sideA: { sets: [[6, 4], [6, 3]] },
        sideB: { sets: [] },
      }).status,
    ).toBe("complete");
    expect(
      resolveMatchScoring({
        config: { mode: "race_to", raceTo: { value: 4 } },
        sideA: { points: 4 },
        sideB: { points: 2 },
      }).status,
    ).toBe("complete");
    expect(
      resolveMatchScoring({
        config: { mode: "total", totalSets: 3 },
        sideA: { sets: [[6, 4], [3, 6], [6, 2]] },
        sideB: { sets: [] },
      }).status,
    ).toBe("complete");
  });
});

describe("stage scoring · create → store → read round-trip", () => {
  it("persists independent group/knockout modes through settings build + parse", () => {
    const matchScoring = composeDoubleStageMatchScoring(
      { mode: "race_to", raceTo: { value: 4 } },
      { mode: "best_of", bestOf: 3, setTarget: { value: 6 } },
    );
    const input = settingsInputFromUpsert(
      {
        formatFamily: "custom",
        format: "double_stage",
        matchScoring,
        customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
        matchScoreMode: "games",
        raceToGames: 4,
        raceToGamesGroup: 4,
        rankingMode: "tiered",
        allowedTierLevels: ["bronze"],
        maxTeamsPerGroup: 4,
        teamsAdvancePerGroup: 2,
      } as never,
      "padel",
    );
    const stored = buildTournamentSettings({}, input);
    const parsed = parseTournamentSettings(stored);
    expect(parsed.matchScoring?.group?.mode).toBe("race_to");
    expect(parsed.matchScoring?.knockout?.mode).toBe("best_of");

    const t = stub(stored as Record<string, unknown>);
    expect(getTournamentMatchScoreMode(t, "group")).toBe("games");
    expect(isClassicSetsFormat(t, "knockout")).toBe(true);
    expect(getTournamentMatchScoringHint(t)).toContain("Group: Race to 4");
    expect(getTournamentMatchScoringHint(t)).toContain("KO: Best of 3");
  });

  it("legacy partner-only raceToGamesGroup/Knockout still resolve without matchScoring", () => {
    const t = stub({
      matchScoreMode: "games",
      raceToGames: 4,
      raceToGamesGroup: 4,
      raceToGamesKnockout: 6,
    });
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(getTournamentRaceToTarget(t, "knockout")).toBe(6);
  });
});
