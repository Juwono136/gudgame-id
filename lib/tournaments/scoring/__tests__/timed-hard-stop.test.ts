import { describe, expect, it } from "vitest";
import {
  assertTimedScoreAllowed,
  buildSuddenDeathEndsAt,
  hasSuddenDeathExtended,
} from "@/lib/tournaments/scoring/timed-hard-stop";
import type { TournamentDetail } from "@/lib/tournaments/service";

function mockTournament(
  settings: Record<string, unknown>,
): TournamentDetail {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    settings,
    sportSlug: "padel",
    slug: "test",
  } as TournamentDetail;
}

describe("timed hard stop", () => {
  it("allows scoring when not timed", () => {
    const t = mockTournament({ scoringType: "points" });
    const gate = assertTimedScoreAllowed(t, {
      timerEndsAt: new Date(Date.now() - 60_000),
      scoreA: 5,
      scoreB: 3,
      action: "increment",
    });
    expect(gate.blocked).toBe(false);
  });

  it("rejects increment when expired with a leader", () => {
    const t = mockTournament({ scoringType: "timed", roundDurationMinutes: 15 });
    expect(() =>
      assertTimedScoreAllowed(t, {
        timerEndsAt: new Date(Date.now() - 1_000),
        scoreA: 10,
        scoreB: 8,
        action: "increment",
      }),
    ).toThrow(/Time is up/);
  });

  it("signals sudden-death extension when expired and tied", () => {
    const t = mockTournament({
      scoringType: "timed",
      suddenDeathExtensionMinutes: 2,
    });
    const gate = assertTimedScoreAllowed(t, {
      timerEndsAt: new Date(Date.now() - 1_000),
      scoreA: 7,
      scoreB: 7,
      action: "increment",
      suddenDeathExtended: false,
    });
    expect(gate.blocked).toBe(true);
    if (gate.blocked) expect(gate.reason).toBe("expired_tied_extend");
  });

  it("rejects after sudden death already extended on a tie", () => {
    const t = mockTournament({ scoringType: "timed" });
    expect(() =>
      assertTimedScoreAllowed(t, {
        timerEndsAt: new Date(Date.now() - 1_000),
        scoreA: 7,
        scoreB: 7,
        action: "increment",
        suddenDeathExtended: true,
      }),
    ).toThrow(/Sudden death/);
  });

  it("allows decrement after expiry", () => {
    const t = mockTournament({ scoringType: "timed" });
    const gate = assertTimedScoreAllowed(t, {
      timerEndsAt: new Date(Date.now() - 1_000),
      scoreA: 10,
      scoreB: 8,
      action: "decrement",
    });
    expect(gate.blocked).toBe(false);
  });

  it("builds sudden death end and reads metadata flag", () => {
    const t = mockTournament({
      scoringType: "timed",
      suddenDeathExtensionMinutes: 3,
    });
    const ends = buildSuddenDeathEndsAt(t, new Date("2026-01-01T00:00:00Z"));
    expect(ends.toISOString()).toBe("2026-01-01T00:03:00.000Z");
    expect(hasSuddenDeathExtended({ suddenDeathExtended: true })).toBe(true);
    expect(hasSuddenDeathExtended({})).toBe(false);
  });
});
