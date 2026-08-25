import { describe, expect, it } from "vitest";
import { buildManageScoringRuntime } from "@/lib/tournaments/manage/scoring-runtime";
import type { TournamentDetail } from "@/lib/tournaments/service";

function baseTournament(
  overrides: Partial<TournamentDetail> & { settings?: Record<string, unknown> } = {},
): TournamentDetail {
  return {
    id: "t1",
    name: "Test",
    slug: "test",
    sportSlug: "padel",
    sportId: "s1",
    status: "live",
    format: "double_stage",
    tournamentType: "official",
    playersPerTeam: 2,
    maxTeams: 16,
    officialBilling: "free",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    settings: { courtCount: 8 },
    ...overrides,
  } as TournamentDetail;
}

describe("buildManageScoringRuntime", () => {
  it("marks courts in sync when provisioned equals settings.courtCount", () => {
    const runtime = buildManageScoringRuntime(baseTournament(), 8);
    expect(runtime.courtCount).toBe(8);
    expect(runtime.courtsProvisioned).toBe(8);
    expect(runtime.courtsInSync).toBe(true);
    expect(runtime.manageScoringMode).toBe("groups");
    expect(runtime.raceStage).toBe("group");
  });

  it("flags courts out of sync when provisioned count differs", () => {
    const runtime = buildManageScoringRuntime(baseTournament(), 4);
    expect(runtime.courtsInSync).toBe(false);
    expect(runtime.courtsProvisioned).toBe(4);
  });

  it("prefers mexicano.roundCount for maxRounds", () => {
    const runtime = buildManageScoringRuntime(
      baseTournament({
        format: "mexicano",
        settings: { courtCount: 2, maxRounds: 3, mexicano: { mode: "team", roundCount: 6 } },
      }),
      2,
    );
    expect(runtime.maxRounds).toBe(6);
    expect(runtime.manageScoringMode).toBe("rounds");
  });

  it("reads americano maxRounds from settings", () => {
    const runtime = buildManageScoringRuntime(
      baseTournament({
        format: "americano",
        settings: { courtCount: 4, maxRounds: 10 },
      }),
      4,
    );
    expect(runtime.maxRounds).toBe(10);
    expect(runtime.manageScoringMode).toBe("rounds");
  });
});
