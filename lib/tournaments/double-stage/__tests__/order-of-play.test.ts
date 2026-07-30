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
    ...partial,
  };
}

describe("order of play buckets", () => {
  it("buckets now / next / later / done", () => {
    const buckets = groupMatchesByOrderOfPlay([
      row({ id: "1", status: "in_progress", playOrder: 1 }),
      row({ id: "2", callStatus: "called", playOrder: 2 }),
      row({ id: "3", callStatus: "queued", playOrder: 3 }),
      row({ id: "4", status: "completed", playOrder: 0 }),
    ]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.matches.map((m) => m.id)]));
    expect(byKey.now).toEqual(["1"]);
    expect(byKey.next).toEqual(["2"]);
    expect(byKey.later).toEqual(["3"]);
    expect(byKey.done).toEqual(["4"]);
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
