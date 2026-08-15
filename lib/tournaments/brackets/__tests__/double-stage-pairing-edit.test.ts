import { describe, expect, it } from "vitest";
import {
  getBracketSeedingUiState,
  isBracketSeedingLocked,
} from "@/lib/tournaments/brackets/seeding-state";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";

function match(partial: Partial<BracketMatchView>): BracketMatchView {
  return {
    id: partial.id ?? "m1",
    roundNumber: partial.roundNumber ?? 1,
    matchNumber: partial.matchNumber ?? 1,
    teamAId: partial.teamAId ?? "a",
    teamBId: partial.teamBId ?? "b",
    teamAName: partial.teamAName ?? "A",
    teamBName: partial.teamBName ?? "B",
    teamAPlayers: [],
    teamBPlayers: [],
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    status: partial.status ?? "pending",
    nextMatchId: null,
    courtId: null,
    startedAt: null,
    scheduledAt: null,
    completedAt: null,
    scoreEvents: [],
    playOrder: null,
    callStatus: null,
  };
}

describe("double-stage knockout pairing editability", () => {
  it("stays editable while every knockout match is still pending", () => {
    const matches = [match({ status: "pending" }), match({ id: "m2", matchNumber: 2 })];
    expect(
      isBracketSeedingLocked(matches, "live", { format: "double_stage" }),
    ).toBe(false);
    const ui = getBracketSeedingUiState(matches, "live", { format: "double_stage" });
    expect(ui.locked).toBe(false);
    expect(ui.title).toMatch(/pairings/i);
  });

  it("locks after a knockout match is scored", () => {
    const matches = [match({ status: "completed" }), match({ id: "m2", matchNumber: 2 })];
    expect(
      isBracketSeedingLocked(matches, "live", { format: "double_stage" }),
    ).toBe(true);
    const ui = getBracketSeedingUiState(matches, "live", { format: "double_stage" });
    expect(ui.locked).toBe(true);
    expect(ui.title).toMatch(/locked/i);
  });

  it("does not claim single-elim random seeding for double stage", () => {
    const ui = getBracketSeedingUiState(
      [match({ status: "pending" })],
      "live",
      { format: "double_stage" },
    );
    expect(ui.description.toLowerCase()).not.toContain("randomly");
    expect(ui.description.toLowerCase()).toContain("group 1st");
  });
});
