import { describe, expect, it } from "vitest";
import {
  buildDisplayOrderOfPlayBuckets,
  mapLiveToDisplayScheduleRows,
  mergeScheduleRowWithLiveMatch,
  type DisplayScheduleLiveData,
} from "@/lib/tournaments/double-stage/display-schedule-rows";
import type { ScheduleMatchRow } from "@/lib/tournaments/double-stage/schedule-view";

describe("display schedule rows", () => {
  it("merges in_progress status from live payload when overview is still queued", () => {
    const liveData = {
      tournament: { status: "live" },
      courts: [{ id: "c1", name: "Court 1", courtNumber: 1, sortOrder: 1, activeMatchId: null }],
      matches: [
        {
          id: "lobby-1",
          type: "lobby_round" as const,
          teamAName: "Team A",
          teamBName: "Team B",
          status: "in_progress",
          scoreA: 2,
          scoreB: 1,
          courtId: "c1",
        },
      ],
      doubleStage: {
        groups: [
          {
            id: "g1",
            name: "Group A",
            matches: [
              {
                id: "gm-1",
                teamAName: "Team A",
                teamBName: "Team B",
                status: "pending",
                callStatus: "queued",
                playOrder: 101,
              },
            ],
          },
        ],
      },
      bracket: { matches: [], leaderboard: [], generated: false },
    } as unknown as DisplayScheduleLiveData;

    const rows = mapLiveToDisplayScheduleRows(liveData);
    expect(rows[0]!.status).toBe("in_progress");
    expect(rows[0]!.callStatus).toBe("on_court");
    expect(rows[0]!.scoreA).toBe(2);
    expect(rows[0]!.courtName).toBe("Court 1");

    const buckets = buildDisplayOrderOfPlayBuckets(liveData);
    expect(buckets.find((b) => b.key === "now")?.matches.map((m) => m.id)).toEqual(["gm-1"]);
  });

  it("mergeScheduleRowWithLiveMatch prefers live court and scores", () => {
    const row: ScheduleMatchRow = {
      id: "x",
      kind: "group",
      stageLabel: "Group A",
      teamAName: "A",
      teamBName: "B",
      scoreA: null,
      scoreB: null,
      status: "pending",
      scheduledAt: null,
      callStatus: "queued",
    };
    const merged = mergeScheduleRowWithLiveMatch(
      row,
      {
        id: "lobby",
        type: "lobby_round",
        status: "in_progress",
        scoreA: 4,
        scoreB: 3,
        courtId: "c2",
      },
      [{ id: "c2", name: "Court 2", courtNumber: 2, sortOrder: 2, activeMatchId: null }],
    );
    expect(merged.status).toBe("in_progress");
    expect(merged.scoreA).toBe(4);
    expect(merged.courtName).toBe("Court 2");
  });
});
