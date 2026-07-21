import { describe, expect, it } from "vitest";
import {
  aggregateScorerPoints,
  type MatchScoreEvent,
} from "@/lib/tournaments/scoring/match-score-events";

function event(
  partial: Partial<MatchScoreEvent> &
    Pick<MatchScoreEvent, "scoreA" | "scoreB" | "action">,
): MatchScoreEvent {
  return {
    at: "2026-01-01T00:00:00.000Z",
    userId: "staff-1",
    ...partial,
  };
}

describe("aggregateScorerPoints", () => {
  it("credits +1 for increment events with a scorer", () => {
    const totals = aggregateScorerPoints([
      event({
        action: "increment",
        side: "a",
        scoreA: 1,
        scoreB: 0,
        scorerUserId: "p1",
        scorerName: "Ada",
      }),
      event({
        action: "increment",
        side: "a",
        scoreA: 2,
        scoreB: 0,
        scorerUserId: "p1",
        scorerName: "Ada",
      }),
      event({
        action: "increment",
        side: "b",
        scoreA: 2,
        scoreB: 1,
        scorerUserId: "p2",
        scorerName: "Bea",
      }),
    ]);
    expect(totals).toEqual([
      { key: "p1", displayName: "Ada", points: 2 },
      { key: "p2", displayName: "Bea", points: 1 },
    ]);
  });

  it("credits the point jump for set_points", () => {
    const totals = aggregateScorerPoints([
      event({
        action: "set_points",
        side: "a",
        scoreA: 15,
        scoreB: 0,
        scorerUserId: "p1",
        scorerName: "Ada",
      }),
      event({
        action: "set_points",
        side: "a",
        scoreA: 40,
        scoreB: 0,
        scorerUserId: "p1",
        scorerName: "Ada",
      }),
    ]);
    expect(totals).toEqual([{ key: "p1", displayName: "Ada", points: 40 }]);
  });
});
