import { describe, expect, it } from "vitest";
import {
  groupMatchesByCourt,
  groupMatchesByOrderOfPlay,
  parseCallStatus,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";

function row(partial: Partial<ScheduleMatchRow> & Pick<ScheduleMatchRow, "id">): ScheduleMatchRow {
  return {
    kind: "group",
    stageLabel: "Group A",
    teamAName: "A",
    teamBName: "B",
    scoreA: null,
    scoreB: null,
    status: "pending",
    scheduledAt: null,
    callStatus: "queued",
    ...partial,
  };
}

describe("order of play buckets", () => {
  it("buckets now / next / later / done from call status + live status", () => {
    const buckets = groupMatchesByOrderOfPlay([
      row({ id: "1", status: "in_progress", playOrder: 1 }),
      row({ id: "2", callStatus: "called", playOrder: 2 }),
      row({ id: "3", callStatus: "queued", playOrder: 3 }),
      row({ id: "4", status: "completed", playOrder: 0 }),
    ]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.matches.map((m) => m.id)]));
    expect(byKey.now).toEqual(["1"]);
    expect(byKey.next).toEqual(["2", "3"]);
    expect(byKey.later).toEqual([]);
    expect(byKey.done).toEqual(["4"]);
  });

  it("auto-fills Next with earliest queued matches when none are called", () => {
    const buckets = groupMatchesByOrderOfPlay(
      [
        row({ id: "a", callStatus: "queued", playOrder: 101 }),
        row({ id: "b", callStatus: "queued", playOrder: 102 }),
        row({ id: "c", callStatus: "queued", playOrder: 103 }),
        row({ id: "d", callStatus: "queued", playOrder: 104 }),
      ],
      { nextCapacity: 2 },
    );
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.matches.map((m) => m.id)]));
    expect(byKey.now).toEqual([]);
    expect(byKey.next).toEqual(["a", "b"]);
    expect(byKey.later).toEqual(["c", "d"]);
  });

  it("keeps on_court in Now even when status is still pending", () => {
    const buckets = groupMatchesByOrderOfPlay([
      row({ id: "1", status: "pending", callStatus: "on_court", playOrder: 1 }),
      row({ id: "2", callStatus: "called", playOrder: 2 }),
    ]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.matches.map((m) => m.id)]));
    expect(byKey.now).toEqual(["1"]);
    expect(byKey.next).toEqual(["2"]);
  });

  it("hides empty Done bucket", () => {
    const buckets = groupMatchesByOrderOfPlay([
      row({ id: "1", callStatus: "queued", playOrder: 1 }),
    ]);
    expect(buckets.some((b) => b.key === "done")).toBe(false);
    expect(buckets.some((b) => b.key === "now")).toBe(true);
    expect(buckets.some((b) => b.key === "next")).toBe(true);
    expect(buckets.some((b) => b.key === "later")).toBe(true);
  });

  it("parses call status safely", () => {
    expect(parseCallStatus("on_court")).toBe("on_court");
    expect(parseCallStatus("nope")).toBe("queued");
  });
});

describe("groupMatchesByCourt", () => {
  it("groups by court and sorts unassigned last", () => {
    const groups = groupMatchesByCourt([
      row({ id: "1", courtId: "c2", courtName: "Court 2", playOrder: 2 }),
      row({ id: "2", courtId: "c1", courtName: "Court 1", playOrder: 1 }),
      row({ id: "3", playOrder: 3 }),
      row({ id: "4", courtId: "c1", courtName: "Court 1", playOrder: 0 }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Court 1", "Court 2", "Unassigned"]);
    expect(groups[0]!.matches.map((m) => m.id)).toEqual(["4", "2"]);
  });
});
