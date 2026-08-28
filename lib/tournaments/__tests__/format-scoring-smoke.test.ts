/**
 * End-to-end style smoke coverage for Official match formats, scoring schemas,
 * create/upsert validation, public/manage capabilities, and live/display poll wiring.
 * Pure / unit-level — no DB required.
 */
import { describe, expect, it } from "vitest";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import {
  CUSTOM_FORMATS,
  ORIGINAL_FORMATS,
  OFFICIAL_CREATABLE_FORMATS,
  formatHasGroupStage,
  formatHasKnockout,
  formatHasLobbyRounds,
  isFormatAllowedForFamily,
  summarizeMatchScoring,
  type MatchScoringConfig,
  type OfficialCreatableFormat,
} from "@/lib/tournaments/match-config";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import {
  buildTournamentSettings,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentMatchScoringHint,
  getTournamentRaceToTarget,
  getTournamentScoringPrimaryLabel,
  getTournamentDisplayConfig,
  parseTournamentSettings,
  settingsInputFromUpsert,
} from "@/lib/tournaments/settings";
import {
  applyGamePointDelta,
  emptyMatchGameState,
  isRaceToGamesMatchComplete,
  type MatchGameRules,
} from "@/lib/tournaments/scoring/game-mode";
import {
  resolveMatchScoring,
  resolveSeriesMajority,
} from "@/lib/tournaments/scoring/match-scoring";
import { generateRoundRobinFixtures } from "@/lib/tournaments/double-stage/fixtures";
import { planMexicanoRound } from "@/lib/tournaments/mexicano/round-planner";
import { supportsRoundBasedPlay } from "@/lib/tournaments/core/types";
import {
  clampDisplayRotationIntervalSec,
  resolveLiveRefetchIntervalMs,
  resolveManageScoringRefetchIntervalMs,
} from "@/lib/tournaments/live/poll-intervals";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";

function stubTournament(
  format: string,
  settings: Record<string, unknown> = {},
  overrides: Partial<TournamentDetail> = {},
): TournamentDetail {
  return {
    id: "smoke-t",
    name: "Smoke Test",
    slug: "smoke-test",
    sportSlug: "padel",
    status: "live",
    tournamentType: "official",
    format,
    settings,
    playersPerTeam: 2,
    maxTeams: 16,
    ...overrides,
  } as TournamentDetail;
}

function baseOfficialPayload(
  format: OfficialCreatableFormat,
  extras: Record<string, unknown> = {},
) {
  const startsAt = new Date("2026-08-13T02:00:00.000Z").toISOString();
  const endsAt = new Date("2026-08-21T02:00:00.000Z").toISOString();
  return {
    name: `Smoke ${format}`,
    slug: `smoke-${format.replace(/_/g, "-")}`,
    status: "upcoming" as const,
    tournamentType: "official" as const,
    officialBilling: "free" as const,
    registrationFeeIdr: 0,
    categoryLabel: "Mix" as const,
    format,
    formatFamily:
      format === "modified_swiss"
        ? ("custom" as const)
        : format === "swiss" || format === "mexicano"
          ? ("original" as const)
          : ("custom" as const),
    rankingMode: "tiered" as const,
    allowedTierLevels: ["bronze" as const],
    matchScoring: { mode: "race_to" as const, raceTo: { value: 4 } },
    venue: "GBK SENAYAN",
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

describe("smoke · format family matrix", () => {
  it("partitions Official creatable formats across Original and Custom families", () => {
    for (const format of OFFICIAL_CREATABLE_FORMATS) {
      const inOriginal = isFormatAllowedForFamily("original", format);
      const inCustom = isFormatAllowedForFamily("custom", format);
      expect(inOriginal || inCustom).toBe(true);
      expect(inOriginal && inCustom).toBe(
        format === "double_stage" ||
          format === "americano" ||
          format === "single_elimination" ||
          format === "group_only" ||
          format === "mexicano",
      );
    }
    expect(CUSTOM_FORMATS).toContain("mexicano");
    expect(CUSTOM_FORMATS).toContain("modified_swiss");
    expect(ORIGINAL_FORMATS).toContain("swiss");
    expect(isFormatAllowedForFamily("custom", "mexicano")).toBe(true);
    expect(isFormatAllowedForFamily("original", "swiss")).toBe(true);
    expect(isFormatAllowedForFamily("custom", "swiss")).toBe(false);
    expect(isFormatAllowedForFamily("original", "modified_swiss")).toBe(false);
  });

  it.each(OFFICIAL_CREATABLE_FORMATS)(
    "layer helpers are consistent for %s",
    (format) => {
      expect(formatHasGroupStage(format)).toBe(
        format === "double_stage" ||
          format === "group_only" ||
          format === "swiss" ||
          format === "modified_swiss",
      );
      expect(formatHasKnockout(format)).toBe(
        format === "double_stage" || format === "single_elimination",
      );
      expect(formatHasLobbyRounds(format)).toBe(
        format === "americano" || format === "mexicano",
      );
    },
  );
});

describe("smoke · capabilities → public tabs / manage mode", () => {
  const cases: Array<{
    format: string;
    settings?: Record<string, unknown>;
    expect: {
      manageScoringMode: "rounds" | "bracket" | "groups";
      showGroupsTab: boolean;
      showBracketTab: boolean;
      showScheduleTab: boolean;
      hasLobbyRounds: boolean;
      canGenerateKnockout: boolean;
    };
  }> = [
    {
      format: "double_stage",
      settings: { doubleStage: { phase: "group" } },
      expect: {
        manageScoringMode: "groups",
        showGroupsTab: true,
        showBracketTab: true,
        showScheduleTab: true,
        hasLobbyRounds: false,
        canGenerateKnockout: true,
      },
    },
    {
      format: "double_stage",
      settings: { doubleStage: { phase: "knockout" } },
      expect: {
        manageScoringMode: "bracket",
        showGroupsTab: true,
        showBracketTab: true,
        showScheduleTab: true,
        hasLobbyRounds: false,
        canGenerateKnockout: true,
      },
    },
    {
      format: "group_only",
      expect: {
        manageScoringMode: "groups",
        showGroupsTab: true,
        showBracketTab: false,
        showScheduleTab: true,
        hasLobbyRounds: false,
        canGenerateKnockout: false,
      },
    },
    {
      format: "single_elimination",
      expect: {
        manageScoringMode: "bracket",
        showGroupsTab: false,
        showBracketTab: true,
        showScheduleTab: false,
        hasLobbyRounds: false,
        canGenerateKnockout: true,
      },
    },
    {
      format: "americano",
      expect: {
        manageScoringMode: "rounds",
        showGroupsTab: false,
        showBracketTab: false,
        showScheduleTab: false,
        hasLobbyRounds: true,
        canGenerateKnockout: false,
      },
    },
    {
      format: "mexicano",
      expect: {
        manageScoringMode: "rounds",
        showGroupsTab: false,
        showBracketTab: false,
        showScheduleTab: false,
        hasLobbyRounds: true,
        canGenerateKnockout: false,
      },
    },
  ];

  it.each(cases)("$format → manage=$expect.manageScoringMode", (row) => {
    const caps = getFormatCapabilities(stubTournament(row.format, row.settings));
    expect(caps.manageScoringMode).toBe(row.expect.manageScoringMode);
    expect(caps.showGroupsTab).toBe(row.expect.showGroupsTab);
    expect(caps.showBracketTab).toBe(row.expect.showBracketTab);
    expect(caps.showScheduleTab).toBe(row.expect.showScheduleTab);
    expect(caps.hasLobbyRounds).toBe(row.expect.hasLobbyRounds);
    expect(caps.canGenerateKnockout).toBe(row.expect.canGenerateKnockout);
  });

  it("double_stage knockout phase clears hasGroupStage so bracket scoring unlocks", () => {
    const groupCaps = getFormatCapabilities(
      stubTournament("double_stage", { doubleStage: { phase: "group" } }),
    );
    const koCaps = getFormatCapabilities(
      stubTournament("double_stage", { doubleStage: { phase: "knockout" } }),
    );
    expect(groupCaps.hasGroupStage).toBe(true);
    expect(groupCaps.hasBracket).toBe(false);
    expect(groupCaps.manageScoringMode).toBe("groups");
    expect(koCaps.hasGroupStage).toBe(false);
    expect(koCaps.hasBracket).toBe(true);
    expect(koCaps.manageScoringMode).toBe("bracket");
  });

  it("lobby round play is enabled for Official Americano & Mexicano", () => {
    expect(
      supportsRoundBasedPlay({ tournamentType: "official", format: "americano" }),
    ).toBe(true);
    expect(
      supportsRoundBasedPlay({ tournamentType: "official", format: "mexicano" }),
    ).toBe(true);
    expect(
      supportsRoundBasedPlay({ tournamentType: "official", format: "double_stage" }),
    ).toBe(false);
  });
});

describe("smoke · create upsert validation per format", () => {
  it.each([
    ["double_stage", { maxTeamsPerGroup: 4, teamsAdvancePerGroup: 2, customMatch: { groupMeetingsPerPair: 2, knockoutLegsPerSlot: 3 } }],
    ["group_only", { maxTeamsPerGroup: 4, customMatch: { groupMeetingsPerPair: 2, knockoutLegsPerSlot: 1 } }],
    ["single_elimination", { customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 3 } }],
    ["americano", { scoringType: "timed", roundDurationMinutes: 15 }],
    [
      "mexicano",
      {
        formatFamily: "original",
        mexicano: { mode: "individual", roundCount: 6 },
        maxRounds: 6,
      },
    ],
    [
      "modified_swiss",
      {
        formatFamily: "custom",
        maxTeamsPerGroup: 3,
        teamsAdvancePerGroup: 1,
        customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
        matchScoring: { mode: "race_to", raceTo: { value: 6 } },
      },
    ],
    ["swiss", { formatFamily: "original", maxTeamsPerGroup: 4 }],
  ] as const)("accepts valid Official %s payload", (format, extras) => {
    const parsed = tournamentUpsertSchema.safeParse(
      baseOfficialPayload(format, extras as Record<string, unknown>),
    );
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("accepts Mexicano under Custom family", () => {
    const parsed = tournamentUpsertSchema.safeParse(
      baseOfficialPayload("mexicano", {
        formatFamily: "custom",
        mexicano: { mode: "team", roundCount: 5 },
        maxRounds: 5,
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects Swiss under Custom family", () => {
    const parsed = tournamentUpsertSchema.safeParse(
      baseOfficialPayload("swiss", {
        formatFamily: "custom",
        maxTeamsPerGroup: 4,
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects free Official with a registration fee", () => {
    const parsed = tournamentUpsertSchema.safeParse(
      baseOfficialPayload("single_elimination", {
        officialBilling: "free",
        registrationFeeIdr: 50000,
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects paid Official without fee", () => {
    const parsed = tournamentUpsertSchema.safeParse(
      baseOfficialPayload("single_elimination", {
        officialBilling: "paid",
        registrationFeeIdr: 0,
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects Fun Match using group_only", () => {
    const parsed = tournamentUpsertSchema.safeParse({
      ...baseOfficialPayload("group_only"),
      tournamentType: "fun_match",
      officialBilling: null,
      categoryLabel: "",
      rankingMode: undefined,
      allowedTierLevels: undefined,
      matchScoring: undefined,
      formatFamily: undefined,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("smoke · match scoring schemas (live + resolve)", () => {
  const raceTo8: MatchScoringConfig = { mode: "race_to", raceTo: { value: 8 } };
  const bestOf3: MatchScoringConfig = {
    mode: "best_of",
    bestOf: 3,
    setTarget: { value: 6 },
  };
  const total3: MatchScoringConfig = { mode: "total", totalSets: 3 };
  const customLarge: MatchScoringConfig = {
    mode: "custom_score",
    customScore: {
      variant: "large_score",
      allowDraw: false,
      tiePolicy: "host_manual",
    },
  };

  it("race_to custom 8 completes only at 8 games", () => {
    const rules: MatchGameRules = {
      raceToGames: 8,
      pointsToWinGame: 40,
      gameDecider: "golden_point",
      pointStyle: "simple",
    };
    expect(isRaceToGamesMatchComplete(7, 3, rules).complete).toBe(false);
    expect(isRaceToGamesMatchComplete(8, 3, rules)).toEqual({
      complete: true,
      winner: "a",
    });
    expect(resolveMatchScoring({
      config: raceTo8,
      sideA: { points: 8 },
      sideB: { points: 3 },
    }).status).toBe("complete");
  });

  it("best_of / total / custom large score resolve as expected", () => {
    expect(
      resolveMatchScoring({
        config: bestOf3,
        sideA: { sets: [[6, 4], [6, 3]] },
        sideB: { sets: [] },
      }).status,
    ).toBe("complete");

    expect(
      resolveMatchScoring({
        config: total3,
        sideA: { sets: [[6, 4], [3, 6], [6, 2]] },
        sideB: { sets: [] },
      }).status,
    ).toBe("complete");

    expect(
      resolveMatchScoring({
        config: customLarge,
        sideA: { points: 40 },
        sideB: { points: 22 },
      }).status,
    ).toBe("incomplete");

    expect(
      resolveMatchScoring({
        config: customLarge,
        sideA: { points: 40 },
        sideB: { points: 22 },
        hostMarkedComplete: true,
      }),
    ).toMatchObject({ status: "complete", winner: "a" });
  });

  it("intra-game ±1 scoring reaches race-to-N without throwing", () => {
    const rules: MatchGameRules = {
      raceToGames: 2,
      pointsToWinGame: 4,
      gameDecider: "golden_point",
      pointStyle: "simple",
    };
    let gamesA = 0;
    let gamesB = 0;
    let state = emptyMatchGameState();
    for (let i = 0; i < 4; i++) {
      const next = applyGamePointDelta(gamesA, gamesB, state, "a", 1, rules);
      expect(next).not.toBeNull();
      gamesA = next!.gamesA;
      gamesB = next!.gamesB;
      state = next!.gameState;
      if (next!.gameJustWon) {
        state = {
          ...state,
          currentPointsA: 0,
          currentPointsB: 0,
          pendingGameWinner: null,
        };
      }
    }
    // After one game won to 4, need another game for race-to-2
    for (let i = 0; i < 4; i++) {
      const next = applyGamePointDelta(gamesA, gamesB, state, "a", 1, rules);
      expect(next).not.toBeNull();
      gamesA = next!.gamesA;
      gamesB = next!.gamesB;
      state = next!.gameState;
      if (next!.gameJustWon) {
        state = {
          ...state,
          currentPointsA: 0,
          currentPointsB: 0,
          pendingGameWinner: null,
        };
      }
    }
    expect(isRaceToGamesMatchComplete(gamesA, gamesB, rules).complete).toBe(true);
  });

  it("persisted race_to 8 drives live labels / game rules (not legacy Race to 6)", () => {
    const t = stubTournament("double_stage", {
      matchScoreMode: "games",
      raceToGames: 6,
      pointsPerMatch: 21,
      matchScoring: { mode: "race_to", raceTo: { value: 8 } },
    });
    expect(getTournamentMatchScoreMode(t)).toBe("games");
    expect(getTournamentRaceToTarget(t)).toBe(8);
    expect(getTournamentGameRules(t).raceToGames).toBe(8);
    expect(getTournamentScoringPrimaryLabel(t)).toBe("Race to 8");
    expect(getTournamentMatchScoringHint(t)).toBe("Race to 8");
    expect(summarizeMatchScoring(raceTo8)).toBe("Race to 8");
  });

  it("Double Stage group vs knockout race-to stay isolated end-to-end", () => {
    const t = stubTournament("double_stage", {
      matchScoreMode: "games",
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 4 },
        group: { mode: "race_to", raceTo: { value: 4 } },
        knockout: { mode: "race_to", raceTo: { value: 6 } },
      },
      raceToGamesGroup: 4,
      raceToGamesKnockout: 6,
    });
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(getTournamentRaceToTarget(t, "knockout")).toBe(6);
    expect(getTournamentGameRules(t, "group").raceToGames).toBe(4);
    expect(getTournamentGameRules(t, "knockout").raceToGames).toBe(6);
    expect(getTournamentMatchScoringHint(t)).toBe("Group: Race to 4 · KO: Race to 6");
    expect(getTournamentScoringPrimaryLabel(t)).toBe("Group: Race to 4 · KO: Race to 6");
  });

  it("Double Stage can mix Best of group with Race to knockout", () => {
    const t = stubTournament("double_stage", {
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 4 },
        group: { mode: "race_to", raceTo: { value: 4 } },
        knockout: { mode: "best_of", bestOf: 3, setTarget: { value: 6 } },
      },
    });
    expect(getTournamentMatchScoreMode(t, "group")).toBe("games");
    expect(getTournamentMatchScoreMode(t, "knockout")).toBe("games");
    expect(getTournamentMatchScoringHint(t)).toContain("Best of 3");
  });

  it("does not flip Fun Match points into games via derived matchScoring", () => {
    const t = stubTournament("americano", {
      scoringType: "points",
      pointsPerMatch: 21,
    }, { tournamentType: "fun_match" });
    expect(getTournamentMatchScoreMode(t)).toBe("points");
  });
});

describe("smoke · meetings, KO legs, mexicano planner", () => {
  it("group meetings create independent fixtures", () => {
    const teams = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() }));
    const fixtures = generateRoundRobinFixtures(teams, 3);
    expect(fixtures).toHaveLength(18);
    expect(new Set(fixtures.map((f) => f.meetingIndex))).toEqual(new Set([1, 2, 3]));
  });

  it("best-of-3 series advances on majority", () => {
    expect(resolveSeriesMajority(["a", "b", "a"])).toMatchObject({
      status: "complete",
      winner: "a",
      winsA: 2,
      winsB: 1,
    });
    expect(resolveSeriesMajority(["a", "b", null]).status).toBe("incomplete");
  });

  it("mexicano individual pairing stays nearby on leaderboard", () => {
    const players = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      id: String(n),
      name: `P${n}`,
      points: 100 - n,
    }));
    const plan = planMexicanoRound({
      players,
      roundNumber: 2,
      mode: "individual",
      courtCount: 2,
    });
    expect(plan.pairings).toHaveLength(2);
    expect(plan.pairings[0]!.teamA.map((p) => p.id).sort()).toEqual(["1", "4"]);
  });
});

describe("smoke · settings round-trip (create → stored → read)", () => {
  it("stores Official matchScoring + customMatch and reads them back", () => {
    const input = settingsInputFromUpsert(
      {
        formatFamily: "custom",
        matchScoring: { mode: "race_to", raceTo: { value: 8 } },
        customMatch: { groupMeetingsPerPair: 2, knockoutLegsPerSlot: 3 },
        matchScoreMode: "games",
        rankingMode: "tiered",
        allowedTierLevels: ["bronze"],
        format: "double_stage",
        maxTeamsPerGroup: 4,
        teamsAdvancePerGroup: 2,
      } as never,
      "padel",
    );
    const stored = buildTournamentSettings({}, input);
    const parsed = parseTournamentSettings(stored);
    expect(parsed.matchScoring?.mode).toBe("race_to");
    expect(parsed.matchScoring?.raceTo?.value).toBe(8);
    expect(parsed.customMatch?.groupMeetingsPerPair).toBe(2);
    expect(parsed.customMatch?.knockoutLegsPerSlot).toBe(3);
    expect(parsed.matchScoreMode).toBe("games");
  });

  it("group_only settings freeze KO advancement fields", () => {
    const input = settingsInputFromUpsert(
      {
        format: "group_only",
        maxTeamsPerGroup: 4,
        matchScoreMode: "games",
        raceToGames: 4,
        rankingMode: "open",
      } as never,
      "padel",
    );
    expect(input.doubleStage?.phase).toBe("group");
    expect(input.doubleStage?.teamsAdvancePerGroup).toBe(0);
    expect(input.doubleStage?.thirdPlaceEnabled).toBe(false);
  });
});

describe("smoke · live + fullscreen display realtime wiring", () => {
  it("public live poll tightens when a match is in progress", () => {
    const idle = resolveLiveRefetchIntervalMs({
      phase: "live",
      tournament: { status: "live" },
      matches: [{ status: "scheduled" }],
    } as TournamentLivePayload);
    const active = resolveLiveRefetchIntervalMs({
      phase: "live",
      tournament: { status: "live" },
      matches: [{ status: "in_progress" }],
    } as TournamentLivePayload);
    expect(active).toBeLessThan(idle);
    expect(active).toBe(4000);
    expect(idle).toBe(6000);
  });

  it("manage scoring poll tightens for active group / bracket / lobby matches", () => {
    expect(
      resolveManageScoringRefetchIntervalMs({
        hasActiveReclub: false,
        hasActiveBracket: false,
        hasActiveGroup: false,
      }),
    ).toBe(15000);
    expect(
      resolveManageScoringRefetchIntervalMs({
        hasActiveReclub: false,
        hasActiveBracket: false,
        hasActiveGroup: true,
      }),
    ).toBe(5000);
    expect(
      resolveManageScoringRefetchIntervalMs({
        hasActiveReclub: true,
        hasActiveBracket: false,
        hasActiveGroup: false,
      }),
    ).toBe(5000);
  });

  it("display rotation interval is clamped for venue TV safety", () => {
    expect(clampDisplayRotationIntervalSec(undefined)).toBe(15);
    expect(clampDisplayRotationIntervalSec(1)).toBe(5);
    expect(clampDisplayRotationIntervalSec(999)).toBe(120);
    expect(clampDisplayRotationIntervalSec(30)).toBe(30);
  });

  it("display config parse keeps layout + interval for live payload consumers", () => {
    const t = stubTournament("americano", {
      displayConfig: {
        layout: "multi_court",
        autoRotate: false,
        rotationIntervalSec: 20,
        showUpcoming: true,
        showHighlights: true,
      },
    });
    const cfg = getTournamentDisplayConfig(t);
    expect(cfg.layout).toBe("multi_court");
    expect(cfg.rotationIntervalSec).toBe(20);
  });

  it("fullscreen games mode uses live scoring race target (incl. custom 8)", async () => {
    const { resolveGamesDisplayMode } = await import(
      "@/lib/tournaments/live/display-scoring"
    );
    expect(
      resolveGamesDisplayMode({ matchScoreMode: "points" }, null),
    ).toBeUndefined();
    expect(
      resolveGamesDisplayMode(
        {
          matchScoreMode: "games",
          raceToGames: 8,
          lengthMode: "total",
          pointsToWinGame: 40,
          pointStyle: "simple",
        },
        { gameState: { currentPointsA: 15, currentPointsB: 10, completedGames: [] } },
      ),
    ).toEqual({
      pointsA: 15,
      pointsB: 10,
      raceToGames: 8,
      pointsToWinGame: 40,
      lengthMode: "total",
      classicSets: false,
    });
  });
});
