import { describe, expect, it } from "vitest";
import {
  deriveStatsTier,
  isFunMatchType,
  normalizeTournamentType,
  resolveTournamentLivePhase,
} from "@/lib/tournaments/core/types";

describe("tournament core types", () => {
  it("normalizes recreational to fun_match", () => {
    expect(normalizeTournamentType("recreational")).toBe("fun_match");
    expect(isFunMatchType("recreational")).toBe(true);
  });

  it("derives separate stats tiers", () => {
    expect(
      deriveStatsTier({ tournamentType: "official", officialBilling: "paid" }),
    ).toBe("official_paid");
    expect(
      deriveStatsTier({ tournamentType: "official", officialBilling: "free" }),
    ).toBe("official_free");
    expect(deriveStatsTier({ tournamentType: "fun_match", officialBilling: null })).toBe(
      "fun_match",
    );
  });

  it("resolves live phase from status", () => {
    expect(resolveTournamentLivePhase("upcoming")).toBe("not_started");
    expect(resolveTournamentLivePhase("live")).toBe("live");
    expect(resolveTournamentLivePhase("completed")).toBe("completed");
  });
});

describe("tournament validation rules", () => {
  it("requires official billing for official tournaments", async () => {
    const { tournamentUpsertSchema } = await import("@/lib/validations/tournaments");
    const result = tournamentUpsertSchema.safeParse({
      name: "Test Open",
      tournamentType: "official",
      format: "single_elimination",
      categoryLabel: "Male",
    });
    expect(result.success).toBe(false);
  });

  it("allows free official without registration fee", async () => {
    const { tournamentUpsertSchema } = await import("@/lib/validations/tournaments");
    const result = tournamentUpsertSchema.safeParse({
      name: "Free Open",
      tournamentType: "official",
      officialBilling: "free",
      format: "single_elimination",
      categoryLabel: "Mix",
      registrationFeeIdr: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("permissions", () => {
  it("blocks players from creating official tournaments", async () => {
    const { canCreateOfficialTournament } = await import("@/lib/tournaments/permissions");
    expect(canCreateOfficialTournament(["player"])).toBe(false);
    expect(canCreateOfficialTournament(["host"])).toBe(true);
  });
});
