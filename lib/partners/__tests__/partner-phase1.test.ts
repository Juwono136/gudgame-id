import { describe, expect, it } from "vitest";
import {
  isReservedPartnerSlug,
  isValidPartnerSlugFormat,
  normalizePartnerSlug,
} from "@/lib/partners/constants";
import {
  getTournamentRaceToGamesForStage,
  parseTournamentSettings,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

describe("partner slug rules", () => {
  it("normalizes and rejects reserved segments", () => {
    expect(normalizePartnerSlug("PadelArea")).toBe("padelarea");
    expect(isReservedPartnerSlug("admin")).toBe(true);
    expect(isReservedPartnerSlug("sports")).toBe(true);
    expect(isValidPartnerSlugFormat("padelarea")).toBe(true);
    expect(isValidPartnerSlugFormat("admin")).toBe(false);
  });
});

describe("race-to per stage", () => {
  const base = {
    id: "t1",
    sportId: "s1",
    sportSlug: "padel",
    sportName: "Padel",
    slug: "open",
    name: "Open",
    summary: null,
    status: "live" as const,
    tournamentType: "fun_match",
    officialBilling: null,
    venue: null,
    categoryLabel: "Mix",
    registrationFeeIdr: null,
    startsAt: null,
    endsAt: null,
    updatedAt: new Date().toISOString(),
    description: null,
    rules: null,
    coverImageUrl: null,
    coverImageStorageKey: null,
    format: "double_stage",
    maxTeams: 32,
    playersPerTeam: 2,
    prizePoolIdr: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    createdBy: null,
    creatorName: null,
    creatorImage: null,
    partnerId: "p1",
    partnerSlug: "spark-area",
  };

  it("uses group and knockout race-to when set", () => {
    const tournament = {
      ...base,
      settings: {
        matchScoreMode: "games",
        raceToGames: 4,
        raceToGamesGroup: 4,
        raceToGamesKnockout: 6,
      },
    } as TournamentDetail;

    expect(getTournamentRaceToGamesForStage(tournament, "group")).toBe(4);
    expect(getTournamentRaceToGamesForStage(tournament, "knockout")).toBe(6);
    expect(getTournamentRaceToGamesForStage(tournament, "default")).toBe(4);
  });

  it("falls back to raceToGames when stage-specific values are missing", () => {
    const tournament = {
      ...base,
      settings: { matchScoreMode: "games", raceToGames: 6 },
    } as TournamentDetail;
    expect(getTournamentRaceToGamesForStage(tournament, "group")).toBe(6);
    expect(getTournamentRaceToGamesForStage(tournament, "knockout")).toBe(6);
  });

  it("parses stage race-to from settings JSON", () => {
    const parsed = parseTournamentSettings({
      raceToGames: 4,
      raceToGamesGroup: 4,
      raceToGamesKnockout: 6,
    });
    expect(parsed.raceToGamesGroup).toBe(4);
    expect(parsed.raceToGamesKnockout).toBe(6);
  });
});
