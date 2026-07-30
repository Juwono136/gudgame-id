import { describe, expect, it } from "vitest";
import { revisionsToAuditScoreEvents } from "@/lib/tournaments/scoring/revision-audit";
import {
  buildPointLogRows,
  describeScoreEvent,
} from "@/lib/tournaments/scoring/event-labels";

describe("score revisions audit mapping", () => {
  it("maps decrement revisions into score events for manage UI", () => {
    const events = revisionsToAuditScoreEvents([
      {
        seq: 1,
        action: "increment",
        scoreAAfter: 1,
        scoreBAfter: 0,
        side: "a",
        actorUserId: "u1",
        actorName: "Host",
        createdAt: "2026-01-01T00:00:01.000Z",
      },
      {
        seq: 2,
        action: "decrement",
        scoreAAfter: 0,
        scoreBAfter: 0,
        side: "a",
        actorUserId: "u1",
        actorName: "Host",
        createdAt: "2026-01-01T00:00:02.000Z",
      },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.action).toBe("decrement");
    expect(events[0]!.scoreA).toBe(0);

    const rows = buildPointLogRows(events, { includeAudit: true });
    expect(rows).toHaveLength(1);
    expect(describeScoreEvent(rows[0]!.event)).toContain("−1");
  });
});
