import { describe, expect, it } from "vitest";
import { clampInt } from "@/lib/tournaments/form/bounded-number";
import {
  GROUP_MEETINGS_PER_PAIR_MAX,
  GROUP_MEETINGS_PER_PAIR_MIN,
  KNOCKOUT_LEGS_PER_SLOT_MAX,
  KNOCKOUT_LEGS_PER_SLOT_MIN,
  RACE_TO_CUSTOM_MAX,
  RACE_TO_CUSTOM_MIN,
  composeDoubleStageMatchScoring,
  parseCustomMatchSettings,
  parseMatchScoringConfig,
} from "@/lib/tournaments/match-config";
import {
  buildTournamentSettings,
  getTournamentCustomMatchSettings,
  getTournamentMatchScoreMode,
  getTournamentRaceToTarget,
  parseTournamentSettings,
  settingsInputFromUpsert,
} from "@/lib/tournaments/settings";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import { generateRoundRobinFixtures } from "@/lib/tournaments/double-stage/fixtures";
import { resolveSeriesMajority } from "@/lib/tournaments/scoring/match-scoring";
import type { TournamentDetail } from "@/lib/tournaments/service";

/**
 * Mirrors BoundedNumberInput commit-on-blur: draft string → clamped int.
 * Intermediate drafts ("" / "12" while max=10) must not poison parent state mid-edit.
 */
function commitDraft(raw: string, min: number, max: number): number {
  const parsed = raw.trim() === "" ? Number.NaN : Number(raw);
  return clampInt(parsed, min, max);
}

describe("bounded-number · wizard numeric commit (blur)", () => {
  it("clamps to inclusive bounds", () => {
    expect(clampInt(0, 1, 10)).toBe(1);
    expect(clampInt(15, 1, 10)).toBe(10);
    expect(clampInt(5, 1, 10)).toBe(5);
    expect(clampInt(9.7, 1, 9)).toBe(9);
  });

  it("treats empty / NaN draft as min on commit", () => {
    expect(commitDraft("", GROUP_MEETINGS_PER_PAIR_MIN, GROUP_MEETINGS_PER_PAIR_MAX)).toBe(1);
    expect(commitDraft("   ", KNOCKOUT_LEGS_PER_SLOT_MIN, KNOCKOUT_LEGS_PER_SLOT_MAX)).toBe(1);
    expect(clampInt(Number.NaN, 1, 10)).toBe(1);
  });

  it("allows replacing 1→2 without snapping to max (meetings/legs regression)", () => {
    // Old bug: controlled number onChange saw "12" then Math.min(max) → 10 / 9
    expect(commitDraft("2", GROUP_MEETINGS_PER_PAIR_MIN, GROUP_MEETINGS_PER_PAIR_MAX)).toBe(2);
    expect(commitDraft("3", KNOCKOUT_LEGS_PER_SLOT_MIN, KNOCKOUT_LEGS_PER_SLOT_MAX)).toBe(3);
    expect(commitDraft("5", KNOCKOUT_LEGS_PER_SLOT_MIN, KNOCKOUT_LEGS_PER_SLOT_MAX)).toBe(5);
  });

  it("only clamps oversize values on commit (not mid-digit panic)", () => {
    expect(commitDraft("12", GROUP_MEETINGS_PER_PAIR_MIN, GROUP_MEETINGS_PER_PAIR_MAX)).toBe(10);
    expect(commitDraft("99", KNOCKOUT_LEGS_PER_SLOT_MIN, KNOCKOUT_LEGS_PER_SLOT_MAX)).toBe(9);
    expect(commitDraft("1444", RACE_TO_CUSTOM_MIN, RACE_TO_CUSTOM_MAX)).toBe(99);
    expect(commitDraft("8", RACE_TO_CUSTOM_MIN, RACE_TO_CUSTOM_MAX)).toBe(8);
  });

  it("accepts every legal meetings / legs value", () => {
    for (let n = GROUP_MEETINGS_PER_PAIR_MIN; n <= GROUP_MEETINGS_PER_PAIR_MAX; n++) {
      expect(commitDraft(String(n), GROUP_MEETINGS_PER_PAIR_MIN, GROUP_MEETINGS_PER_PAIR_MAX)).toBe(n);
    }
    for (let n = KNOCKOUT_LEGS_PER_SLOT_MIN; n <= KNOCKOUT_LEGS_PER_SLOT_MAX; n++) {
      expect(commitDraft(String(n), KNOCKOUT_LEGS_PER_SLOT_MIN, KNOCKOUT_LEGS_PER_SLOT_MAX)).toBe(n);
    }
  });
});

describe("bounded-number · sync with schema + fixture engines", () => {
  it("UI bounds match validation + parseCustomMatchSettings", () => {
    const parsedOk = parseCustomMatchSettings({
      groupMeetingsPerPair: 7,
      knockoutLegsPerSlot: 5,
    });
    expect(parsedOk?.groupMeetingsPerPair).toBe(7);
    expect(parsedOk?.knockoutLegsPerSlot).toBe(5);

    // Out of range → parse falls back to defaults (1)
    const parsedHi = parseCustomMatchSettings({
      groupMeetingsPerPair: 99,
      knockoutLegsPerSlot: 99,
    });
    expect(parsedHi?.groupMeetingsPerPair).toBe(1);
    expect(parsedHi?.knockoutLegsPerSlot).toBe(1);

    const startsAt = new Date("2026-08-13T02:00:00.000Z").toISOString();
    const endsAt = new Date("2026-08-21T02:00:00.000Z").toISOString();
    const upsert = tournamentUpsertSchema.safeParse({
      name: "Meetings Bounds",
      slug: "meetings-bounds",
      status: "upcoming",
      tournamentType: "official",
      officialBilling: "free",
      registrationFeeIdr: 0,
      categoryLabel: "Mix",
      format: "double_stage",
      formatFamily: "custom",
      rankingMode: "open",
      matchScoring: {
        mode: "race_to",
        raceTo: { value: 4 },
        group: { mode: "race_to", raceTo: { value: 4 } },
        knockout: { mode: "total", totalSets: 3 },
      },
      customMatch: {
        groupMeetingsPerPair: commitDraft("4", 1, 10),
        knockoutLegsPerSlot: commitDraft("3", 1, 9),
      },
      maxTeamsPerGroup: 4,
      teamsAdvancePerGroup: 2,
      venue: "GBK",
      startsAt,
      endsAt,
      scoringType: "points",
      pointsPerMatch: 21,
      courtCount: 2,
      playersPerTeam: 2,
      maxTeams: 16,
    });
    expect(upsert.success, JSON.stringify(upsert.error?.issues)).toBe(true);
  });

  it("rejects meetings/legs outside schema bounds", () => {
    const startsAt = new Date("2026-08-13T02:00:00.000Z").toISOString();
    const endsAt = new Date("2026-08-21T02:00:00.000Z").toISOString();
    const base = {
      name: "Bad Bounds",
      slug: "bad-bounds",
      status: "upcoming" as const,
      tournamentType: "official" as const,
      officialBilling: "free" as const,
      registrationFeeIdr: 0,
      categoryLabel: "Mix",
      format: "double_stage" as const,
      formatFamily: "custom" as const,
      rankingMode: "open" as const,
      matchScoring: { mode: "race_to" as const, raceTo: { value: 4 } },
      maxTeamsPerGroup: 4,
      teamsAdvancePerGroup: 2,
      venue: "GBK",
      startsAt,
      endsAt,
      scoringType: "points" as const,
      pointsPerMatch: 21,
      courtCount: 2,
      playersPerTeam: 2,
      maxTeams: 16,
    };
    expect(
      tournamentUpsertSchema.safeParse({
        ...base,
        customMatch: { groupMeetingsPerPair: 11, knockoutLegsPerSlot: 3 },
      }).success,
    ).toBe(false);
    expect(
      tournamentUpsertSchema.safeParse({
        ...base,
        customMatch: { groupMeetingsPerPair: 2, knockoutLegsPerSlot: 10 },
      }).success,
    ).toBe(false);
  });

  it("create → store → read preserves committed meetings / legs / total sets", () => {
    const meetings = commitDraft("4", 1, 10);
    const legs = commitDraft("5", 1, 9);
    const totalSets = commitDraft("3", 1, 99);
    const matchScoring = composeDoubleStageMatchScoring(
      { mode: "race_to", raceTo: { value: commitDraft("4", 1, 99) } },
      { mode: "total", totalSets },
    );

    const input = settingsInputFromUpsert(
      {
        formatFamily: "custom",
        format: "double_stage",
        matchScoring,
        customMatch: {
          groupMeetingsPerPair: meetings,
          knockoutLegsPerSlot: legs,
        },
        matchScoreMode: "games",
        rankingMode: "open",
        maxTeamsPerGroup: 4,
        teamsAdvancePerGroup: 2,
      } as never,
      "padel",
    );
    const stored = buildTournamentSettings({}, input);
    const parsed = parseTournamentSettings(stored);
    expect(parsed.customMatch?.groupMeetingsPerPair).toBe(4);
    expect(parsed.customMatch?.knockoutLegsPerSlot).toBe(5);
    expect(parsed.matchScoring?.group?.mode).toBe("race_to");
    expect(parsed.matchScoring?.knockout?.mode).toBe("total");
    expect(parsed.matchScoring?.knockout?.totalSets).toBe(3);

    const t = {
      id: "t1",
      name: "N",
      slug: "n",
      sportSlug: "padel",
      status: "live",
      tournamentType: "official",
      format: "double_stage",
      settings: stored,
    } as TournamentDetail;

    expect(getTournamentCustomMatchSettings(t).groupMeetingsPerPair).toBe(4);
    expect(getTournamentCustomMatchSettings(t).knockoutLegsPerSlot).toBe(5);
    expect(getTournamentRaceToTarget(t, "group")).toBe(4);
    expect(getTournamentMatchScoreMode(t, "knockout")).toBe("games");
  });

  it("committed meetings count drives independent RR fixtures", () => {
    const meetings = commitDraft("3", 1, 10);
    const teams = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() }));
    const fixtures = generateRoundRobinFixtures(teams, meetings);
    // C(4,2)=6 pairs × 3 meetings
    expect(fixtures).toHaveLength(18);
    expect(new Set(fixtures.map((f) => f.meetingIndex))).toEqual(new Set([1, 2, 3]));
  });

  it("committed odd KO legs still resolve majority series", () => {
    const legs = commitDraft("3", 1, 9);
    expect(legs).toBe(3);
    expect(resolveSeriesMajority(["a", "b", "a"])).toMatchObject({
      status: "complete",
      winner: "a",
      winsA: 2,
      winsB: 1,
    });
  });

  it("parseMatchScoring totalSets respects custom max (no 1444 leak)", () => {
    const parsed = parseMatchScoringConfig({
      mode: "total",
      totalSets: 1444,
    });
    // parsePositiveInt rejects out-of-range → default 3
    expect(parsed?.totalSets).toBe(3);

    const ok = parseMatchScoringConfig({
      mode: "total",
      totalSets: commitDraft("7", 1, 99),
    });
    expect(ok?.totalSets).toBe(7);
  });
});
