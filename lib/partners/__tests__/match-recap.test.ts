import { describe, expect, it } from "vitest";
import { buildMatchRecap } from "@/lib/partners/match-recap";

describe("buildMatchRecap", () => {
  it("builds a shareable winner headline and social text", () => {
    const payload = buildMatchRecap({
      partnerName: "SparkArea",
      tournamentName: "Friday Open",
      teamAName: "Alpha",
      teamBName: "Beta",
      teamAPlayers: ["Ada", "Bea"],
      teamBPlayers: ["Cara", "Dee"],
      scoreA: 6,
      scoreB: 3,
      scoreDetail: "6–3, 6–2",
      roundLabel: "Semi-final",
    });

    expect(payload.headline).toBe("Alpha wins 6–3, 6–2");
    expect(payload.subline).toContain("Friday Open");
    expect(payload.subline).toContain("SparkArea");
    expect(payload.playersA).toBe("Ada / Bea");
    expect(payload.shareText).toContain("Ada / Bea vs Cara / Dee");
    expect(payload.shareText).toContain("Played at SparkArea");
  });

  it("handles draws without a winner label", () => {
    const payload = buildMatchRecap({
      partnerName: "SparkArea",
      tournamentName: "League night",
      teamAName: "A",
      teamBName: "B",
      scoreA: 4,
      scoreB: 4,
    });
    expect(payload.headline).toBe("Draw 4–4");
  });
});
