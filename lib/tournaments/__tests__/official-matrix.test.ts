/**
 * Official matrix: paid/free × original/custom × formats × scoring × leaderboard rules.
 */
import { describe, expect, it } from "vitest";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import {
  OFFICIAL_CREATABLE_FORMATS,
  isFormatAllowedForFamily,
  type OfficialCreatableFormat,
  type TournamentFormatFamily,
} from "@/lib/tournaments/match-config";
import {
  getFormatCapabilities,
  getGroupMeetingsPerPair,
  getKnockoutLegsPerSlot,
} from "@/lib/tournaments/format-capabilities";
import {
  buildTournamentSettings,
  parseTournamentSettings,
  settingsInputFromUpsert,
} from "@/lib/tournaments/settings";
import { isBracketSeriesChildLeg } from "@/lib/tournaments/brackets/bracket-metadata";
import { mexicanoLeaderboardFromPlayerPoints } from "@/lib/tournaments/mexicano/leaderboard";
import { tournamentUsesTierRestrictions } from "@/lib/tournaments/tier-restrictions";
import type { TournamentDetail } from "@/lib/tournaments/service";

function stub(
  format: string,
  settings: Record<string, unknown>,
): TournamentDetail {
  return {
    id: "m1",
    name: "Matrix",
    slug: "matrix",
    sportSlug: "padel",
    status: "live",
    tournamentType: "official",
    format,
    settings,
  } as TournamentDetail;
}

function officialPayload(
  format: OfficialCreatableFormat,
  opts: {
    billing: "paid" | "free";
    family: TournamentFormatFamily;
    rankingMode?: "tiered" | "open";
    extras?: Record<string, unknown>;
  },
) {
  const startsAt = new Date("2026-09-01T02:00:00.000Z").toISOString();
  const endsAt = new Date("2026-09-07T02:00:00.000Z").toISOString();
  return {
    name: `Official ${opts.billing} ${opts.family} ${format}`,
    slug: `off-${opts.billing}-${opts.family}-${format}`.replace(/_/g, "-"),
    status: "upcoming" as const,
    tournamentType: "official" as const,
    officialBilling: opts.billing,
    registrationFeeIdr: opts.billing === "paid" ? 150000 : 0,
    categoryLabel: "Mix" as const,
    format,
    formatFamily: opts.family,
    rankingMode: opts.rankingMode ?? ("tiered" as const),
    allowedTierLevels: opts.rankingMode === "open" ? [] : (["silver"] as const),
    matchScoring: { mode: "race_to" as const, raceTo: { value: 6 } },
    venue: "Senayan",
    startsAt,
    endsAt,
    scoringType: "points" as const,
    pointsPerMatch: 21,
    courtCount: 2,
    playersPerTeam: 2,
    maxTeams: 16,
    ...(format === "mexicano"
      ? { mexicano: { mode: "team" as const, roundCount: 5 }, maxRounds: 5 }
      : {}),
    ...(opts.family === "custom" &&
    (format === "double_stage" ||
      format === "group_only" ||
      format === "single_elimination")
      ? {
          customMatch: {
            groupMeetingsPerPair: 2,
            knockoutLegsPerSlot: 3,
          },
        }
      : {}),
    ...(format === "double_stage" || format === "group_only"
      ? { maxTeamsPerGroup: 4, teamsAdvancePerGroup: format === "double_stage" ? 2 : undefined }
      : {}),
    ...opts.extras,
  };
}

describe("official matrix · paid/free × original/custom upsert", () => {
  const billings = ["paid", "free"] as const;
  const families = ["original", "custom"] as const;

  for (const billing of billings) {
    for (const family of families) {
      for (const format of OFFICIAL_CREATABLE_FORMATS) {
        if (!isFormatAllowedForFamily(family, format)) {
          it(`rejects ${billing}/${family}/${format}`, () => {
            const parsed = tournamentUpsertSchema.safeParse(
              officialPayload(format, { billing, family }),
            );
            expect(parsed.success).toBe(false);
          });
          continue;
        }

        it(`accepts ${billing}/${family}/${format}`, () => {
          const parsed = tournamentUpsertSchema.safeParse(
            officialPayload(format, { billing, family }),
          );
          expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
        });
      }
    }
  }

  it("accepts paid + No Rank (open) with zero ranking gate", () => {
    const parsed = tournamentUpsertSchema.safeParse(
      officialPayload("single_elimination", {
        billing: "paid",
        family: "original",
        rankingMode: "open",
      }),
    );
    expect(parsed.success).toBe(true);
    expect(
      tournamentUsesTierRestrictions("official", "paid", "open"),
    ).toBe(false);
    expect(
      tournamentUsesTierRestrictions("official", "free", "tiered"),
    ).toBe(true);
  });
});

describe("official matrix · Original ignores leftover customMatch", () => {
  it("meetings/legs stay at 1 for Original even if JSON has custom values", () => {
    const t = stub("double_stage", {
      formatFamily: "original",
      customMatch: { groupMeetingsPerPair: 5, knockoutLegsPerSlot: 7 },
    });
    expect(getGroupMeetingsPerPair(t)).toBe(1);
    expect(getKnockoutLegsPerSlot(t)).toBe(1);
  });

  it("Custom family applies meetings/legs", () => {
    const t = stub("double_stage", {
      formatFamily: "custom",
      customMatch: { groupMeetingsPerPair: 3, knockoutLegsPerSlot: 5 },
    });
    expect(getGroupMeetingsPerPair(t)).toBe(3);
    expect(getKnockoutLegsPerSlot(t)).toBe(5);
  });

  it("saving as Original clears leftover customMatch from settings JSON", () => {
    const existing = {
      formatFamily: "custom",
      customMatch: { groupMeetingsPerPair: 4, knockoutLegsPerSlot: 5 },
      matchScoring: { mode: "race_to", raceTo: { value: 4 } },
    };
    const next = buildTournamentSettings(
      existing,
      settingsInputFromUpsert(
        {
          formatFamily: "original",
          format: "double_stage",
          matchScoring: { mode: "race_to", raceTo: { value: 4 } },
        },
        "padel",
      ),
    );
    const parsed = parseTournamentSettings(next);
    expect(parsed.formatFamily).toBe("original");
    expect(parsed.customMatch).toBeUndefined();
  });

  it("switching away from mexicano clears mexicano settings", () => {
    const existing = {
      mexicano: { mode: "individual", roundCount: 8 },
      formatFamily: "original",
    };
    const next = buildTournamentSettings(
      existing,
      settingsInputFromUpsert(
        {
          formatFamily: "original",
          format: "americano",
          matchScoring: { mode: "race_to", raceTo: { value: 4 } },
        },
        "padel",
      ),
    );
    expect(parseTournamentSettings(next).mexicano).toBeUndefined();
  });
});

describe("official matrix · leaderboard rules", () => {
  it("marks KO series child legs so parent-only W/L can be applied", () => {
    expect(isBracketSeriesChildLeg({ seriesParentId: "parent-1", legIndex: 2 })).toBe(
      true,
    );
    expect(isBracketSeriesChildLeg({ isSeriesSlot: true, legIndex: 1 })).toBe(false);
    expect(isBracketSeriesChildLeg({})).toBe(false);
  });

  it("ranks mexicano session players by points then name", () => {
    const rows = mexicanoLeaderboardFromPlayerPoints([
      { userId: "b", displayName: "Bob", points: 10 },
      { userId: "a", displayName: "Ann", points: 20 },
      { userId: "c", displayName: "Cy", points: 10 },
    ]);
    expect(rows.map((r) => r.playerId)).toEqual(["a", "b", "c"]);
    expect(rows[0]!.rank).toBe(1);
    expect(rows[1]!.points).toBe(10);
  });
});

describe("official matrix · capabilities stay format-correct", () => {
  it.each([
    ["group_only", { canGenerateKnockout: false, manageScoringMode: "groups" }],
    ["mexicano", { canGenerateKnockout: false, manageScoringMode: "rounds" }],
    ["americano", { canGenerateKnockout: false, manageScoringMode: "rounds" }],
    ["single_elimination", { canGenerateKnockout: true, manageScoringMode: "bracket" }],
  ] as const)("%s capabilities", (format, expected) => {
    const caps = getFormatCapabilities(stub(format, {}));
    expect(caps.canGenerateKnockout).toBe(expected.canGenerateKnockout);
    expect(caps.manageScoringMode).toBe(expected.manageScoringMode);
  });
});
