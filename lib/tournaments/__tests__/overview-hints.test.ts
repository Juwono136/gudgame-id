import { describe, expect, it } from "vitest";
import {
  getTournamentFormatHintLines,
  getTournamentScoringDetailLines,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

function baseTournament(overrides: Partial<TournamentDetail> = {}): TournamentDetail {
  return {
    id: "t1",
    name: "Test",
    slug: "test",
    sportSlug: "padel",
    sportName: "Padel",
    format: "double_stage",
    status: "upcoming",
    playersPerTeam: 2,
    maxTeams: 48,
    settings: { courtCount: 5 },
    registrationFeeIdr: 0,
    officialBilling: "free",
    partnerId: "p1",
    partnerSlug: "spark-area",
    startsAt: null,
    endsAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    prizePoolIdr: null,
    venueName: null,
    venueAddress: null,
    venueMapsUrl: null,
    descriptionHtml: null,
    rulesHtml: null,
    ...overrides,
  } as TournamentDetail;
}

describe("overview hint lines", () => {
  it("formats double-stage details as separate lines", () => {
    const lines = getTournamentFormatHintLines(
      baseTournament({
        settings: {
          courtCount: 5,
          doubleStage: { maxTeamsPerGroup: 3, teamsAdvancePerGroup: 1 },
        },
      }),
    );
    expect(lines).toEqual([
      "Up to 48 teams",
      "2 players per team",
      "5 courts",
      "Pools of 3",
      "Advance 1 per pool",
    ]);
  });

  it("splits bestie cup scoring into readable lines", () => {
    const lines = getTournamentScoringDetailLines(
      baseTournament({
        format: "modified_swiss",
        settings: { courtCount: 5, partnerPreset: "bestie_cup" },
      }),
    );
    expect(lines.length).toBeGreaterThan(3);
    expect(lines[lines.length - 1]).toBe("5 courts");
    expect(lines.some((line) => line.includes("R16 & QF"))).toBe(true);
  });
});
