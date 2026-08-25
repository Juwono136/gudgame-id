import { describe, expect, it } from "vitest";
import { groupMatchesByRound } from "@/lib/tournaments/reclub/round-groups";
import { liveMatchesToReclubViews } from "@/lib/tournaments/reclub/live-match-mappers";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";

describe("group stage live roundNumber sync", () => {
  it("maps group_stage matches to distinct RR days for public hub tabs", () => {
    const liveData = {
      matches: [
        {
          id: "a",
          type: "group_stage" as const,
          roundNumber: 1,
          status: "completed",
          teamAName: "A",
          teamBName: "B",
          scoreA: 2,
          scoreB: 0,
        },
        {
          id: "b",
          type: "group_stage" as const,
          roundNumber: 2,
          status: "completed",
          teamAName: "C",
          teamBName: "D",
          scoreA: 2,
          scoreB: 1,
        },
        {
          id: "c",
          type: "group_stage" as const,
          roundNumber: 2,
          status: "pending",
          teamAName: "E",
          teamBName: "F",
          scoreA: 0,
          scoreB: 0,
        },
        {
          id: "d",
          type: "group_stage" as const,
          roundNumber: 3,
          status: "pending",
          teamAName: "G",
          teamBName: "H",
          scoreA: 0,
          scoreB: 0,
        },
      ],
    } as TournamentLivePayload;

    const views = liveMatchesToReclubViews(liveData);
    const groups = groupMatchesByRound(views, { includeFriendly: false });

    expect(groups.map((g) => g.roundNumber)).toEqual([1, 2, 3]);
    expect(groups[0]!.completedCount).toBe(1);
    expect(groups[0]!.matches.length).toBe(1);
    expect(groups[1]!.completedCount).toBe(1);
    expect(groups[1]!.matches.length).toBe(2);
    // Round 1 complete; round 2 not (still has pending)
    expect(
      groups[0]!.completedCount === groups[0]!.matches.length && groups[0]!.liveCount === 0,
    ).toBe(true);
    expect(
      groups[1]!.completedCount === groups[1]!.matches.length && groups[1]!.liveCount === 0,
    ).toBe(false);
  });

  it("defaults missing roundNumber to 1 (legacy payload)", () => {
    const liveData = {
      matches: [
        {
          id: "x",
          type: "group_stage" as const,
          status: "completed",
          teamAName: "A",
          teamBName: "B",
        },
      ],
    } as TournamentLivePayload;
    expect(liveMatchesToReclubViews(liveData)[0]!.roundNumber).toBe(1);
  });
});
