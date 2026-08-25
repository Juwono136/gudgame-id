import { describe, expect, it } from "vitest";
import {
  deriveGroupStageRoundNumber,
  formatGroupStageRoundTabLabel,
  formatGroupStageRoundTitle,
} from "@/lib/tournaments/double-stage/round-number";
import {
  getPreferredLiveScoringRound,
  groupMatchesByRound,
} from "@/lib/tournaments/reclub/round-groups";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

function fakeMatch(
  partial: Partial<ReclubMatchView> & Pick<ReclubMatchView, "id" | "roundNumber" | "status">,
): ReclubMatchView {
  return {
    teamAId: "a",
    teamBId: "b",
    teamAName: "A",
    teamBName: "B",
    scoreA: 0,
    scoreB: 0,
    durationSeconds: null,
    summary: null,
    startedAt: null,
    endedAt: null,
    courtId: null,
    timerEndsAt: null,
    teamAPlayers: [],
    teamBPlayers: [],
    scoreEvents: [],
    sourceKind: "group_stage",
    playType: "group_stage",
    ...partial,
  };
}

describe("deriveGroupStageRoundNumber", () => {
  it("prefers metadata.round over playOrder", () => {
    expect(
      deriveGroupStageRoundNumber({ playOrder: 201, metadataRound: 2 }),
    ).toBe(2);
  });

  it("derives from playOrder when metadata missing", () => {
    expect(deriveGroupStageRoundNumber({ playOrder: 301 })).toBe(3);
    expect(deriveGroupStageRoundNumber({ playOrder: 1 })).toBe(1);
  });
});

describe("formatGroupStageRoundTabLabel", () => {
  it("formats meeting-offset rounds", () => {
    expect(formatGroupStageRoundTabLabel(1)).toBe("1");
    expect(formatGroupStageRoundTabLabel(101)).toBe("1·M2");
    expect(formatGroupStageRoundTitle(101)).toBe("Round 1 · Meeting 2");
  });
});

describe("getPreferredLiveScoringRound", () => {
  it("prefers the live round, then first incomplete", () => {
    const matches = [
      fakeMatch({ id: "1", roundNumber: 1, status: "completed" }),
      fakeMatch({ id: "2", roundNumber: 1, status: "completed" }),
      fakeMatch({ id: "3", roundNumber: 2, status: "in_progress" }),
      fakeMatch({ id: "4", roundNumber: 2, status: "pending" }),
      fakeMatch({ id: "5", roundNumber: 3, status: "pending" }),
    ];
    expect(getPreferredLiveScoringRound(matches)).toBe(2);
    expect(groupMatchesByRound(matches).map((g) => g.roundNumber)).toEqual([1, 2, 3]);
  });
});
