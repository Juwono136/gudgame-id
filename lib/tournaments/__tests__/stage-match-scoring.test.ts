import { describe, expect, it } from "vitest";
import {
  deriveMatchScoringFromLegacy,
  ensureDoubleStageRaceOverrides,
  matchScoringForFormat,
  parseMatchScoringConfig,
  raceToValueForStage,
  resolveMatchScoringForStage,
  summarizeMatchScoring,
} from "@/lib/tournaments/match-config";
import {
  buildTournamentSettings,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentMatchScoringHint,
  getTournamentRaceToTarget,
  parseTournamentSettings,
  settingsInputFromUpsert,
} from "@/lib/tournaments/settings";
import { isRaceToGamesMatchComplete } from "@/lib/tournaments/scoring/game-mode";
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

describe("stage-specific match scoring (group vs knockout)", () => {
  it("resolves different race-to targets per stage from matchScoring", () => {
    const config = parseMatchScoringConfig({
      mode: "race_to",
      raceTo: { value: 4 },
      group: { mode: "race_to", raceTo: { value: 4 } },
      knockout: { mode: "race_to", raceTo: { value: 6 } },
    });
    expect(raceToValueForStage(config, "group")).toBe(4);
    expect(raceToValueForStage(config, "knockout")).toBe(6);
    expect(summarizeMatchScoring(config)).toBe("Group race to 4 · KO race to 6");
  });

  it("merges stage leaf overrides via resolveMatchScoringForStage", () => {
    const config = {
      mode: "race_to" as const,
      raceTo: { value: 4 },
      knockout: { mode: "race_to" as const, raceTo: { value: 8 } },
    };
    const ko = resolveMatchScoringForStage(config, "knockout");
    expect(ko?.raceTo?.value).toBe(8);
    const group = resolveMatchScoringForStage(config, "group");
    expect(group?.raceTo?.value).toBe(4);
  });

  it("drives live game rules from stored stage overrides", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 4 },
        group: { mode: "race_to", raceTo: { value: 4 } },
        knockout: { mode: "race_to", raceTo: { value: 6 } },
      },
    });
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(getTournamentRaceToTarget(t, "knockout")).toBe(6);
    expect(getTournamentGameRules(t, "group").raceToGames).toBe(4);
    expect(getTournamentGameRules(t, "knockout").raceToGames).toBe(6);
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

  it("accepts custom race targets beyond legacy presets", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 5 },
        group: { mode: "race_to", raceTo: { value: 5 } },
        knockout: { mode: "race_to", raceTo: { value: 8 } },
      },
    });
    expect(getTournamentRaceToTarget(t, "group")).toBe(5);
    expect(getTournamentRaceToTarget(t, "knockout")).toBe(8);
  });
});

describe("stage scoring · format isolation (no regression)", () => {
  it("strips stage leaves for non-double-stage formats", () => {
    const dual = {
      mode: "race_to" as const,
      raceTo: { value: 4 },
      group: { mode: "race_to" as const, raceTo: { value: 4 } },
      knockout: { mode: "race_to" as const, raceTo: { value: 6 } },
    };
    const se = matchScoringForFormat(dual, "single_elimination");
    expect(se.group).toBeUndefined();
    expect(se.knockout).toBeUndefined();
    expect(se.raceTo?.value).toBe(4);

    const kept = matchScoringForFormat(dual, "double_stage");
    expect(kept.knockout?.raceTo?.value).toBe(6);
  });

  it("seeds group 4 / KO 6 when entering Double Stage race-to", () => {
    const seeded = ensureDoubleStageRaceOverrides({
      mode: "race_to",
      raceTo: { value: 4 },
    });
    expect(seeded.group?.raceTo?.value).toBe(4);
    expect(seeded.knockout?.raceTo?.value).toBe(6);
  });

  it("does not rewrite best_of / total / custom when ensuring DS overrides", () => {
    expect(
      ensureDoubleStageRaceOverrides({
        mode: "best_of",
        bestOf: 3,
        setTarget: { value: 6 },
      }).mode,
    ).toBe("best_of");
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
      expect(getTournamentRaceToTarget(t, "group")).toBe(8);
      expect(getTournamentRaceToTarget(t, "knockout")).toBe(8);
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

  it("walkover / special-result race targets follow match kind stage", () => {
    const t = stub({
      matchScoreMode: "games",
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 4 },
        group: { mode: "race_to", raceTo: { value: 4 } },
        knockout: { mode: "race_to", raceTo: { value: 6 } },
      },
    });
    // Mirrors match-special-result.ts: kind group → group, bracket → knockout
    expect(getTournamentGameRules(t, "group").raceToGames).toBe(4);
    expect(getTournamentGameRules(t, "knockout").raceToGames).toBe(6);
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

describe("stage scoring · create → store → read round-trip", () => {
  it("persists group/knockout race-to through settings build + parse", () => {
    const input = settingsInputFromUpsert(
      {
        formatFamily: "custom",
        format: "double_stage",
        matchScoring: {
          mode: "race_to",
          raceTo: { value: 4 },
          group: { mode: "race_to", raceTo: { value: 4 } },
          knockout: { mode: "race_to", raceTo: { value: 6 } },
        },
        customMatch: { groupMeetingsPerPair: 1, knockoutLegsPerSlot: 1 },
        matchScoreMode: "games",
        raceToGames: 4,
        raceToGamesGroup: 4,
        raceToGamesKnockout: 6,
        rankingMode: "tiered",
        allowedTierLevels: ["bronze"],
        maxTeamsPerGroup: 4,
        teamsAdvancePerGroup: 2,
      } as never,
      "padel",
    );
    const stored = buildTournamentSettings({}, input);
    const parsed = parseTournamentSettings(stored);
    expect(parsed.matchScoring?.group?.raceTo?.value).toBe(4);
    expect(parsed.matchScoring?.knockout?.raceTo?.value).toBe(6);
    expect(parsed.raceToGamesGroup).toBe(4);
    expect(parsed.raceToGamesKnockout).toBe(6);

    const t = stub(stored as Record<string, unknown>);
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(getTournamentRaceToTarget(t, "knockout")).toBe(6);
    expect(getTournamentMatchScoringHint(t)).toBe("Group race to 4 · KO race to 6");
  });

  it("upsert schema accepts Double Stage with different group/KO race targets", () => {
    const startsAt = new Date("2026-08-13T02:00:00.000Z").toISOString();
    const endsAt = new Date("2026-08-21T02:00:00.000Z").toISOString();
    const parsed = tournamentUpsertSchema.safeParse({
      name: "DS Stage Race",
      slug: "ds-stage-race",
      status: "upcoming",
      tournamentType: "official",
      officialBilling: "free",
      registrationFeeIdr: 0,
      categoryLabel: "Mix",
      format: "double_stage",
      formatFamily: "custom",
      rankingMode: "tiered",
      allowedTierLevels: ["bronze"],
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 4 },
        group: { mode: "race_to", raceTo: { value: 4 } },
        knockout: { mode: "race_to", raceTo: { value: 6 } },
      },
      customMatch: { groupMeetingsPerPair: 2, knockoutLegsPerSlot: 1 },
      maxTeamsPerGroup: 4,
      teamsAdvancePerGroup: 2,
      raceToGamesGroup: 4,
      raceToGamesKnockout: 6,
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
