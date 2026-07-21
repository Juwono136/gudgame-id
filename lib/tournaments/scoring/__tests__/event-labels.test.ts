import {
  buildPointLogRows,
  describeScoreEvent,
  pointAmountForEvent,
} from "@/lib/tournaments/scoring/event-labels";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import { describe, expect, it } from "vitest";

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

const ctx = {
  teamAName: "Team Alpha",
  teamBName: "Team Beta",
  teamAPlayers: ["Ada"],
  teamBPlayers: ["Bea", "Cara"],
};

describe("point log event labels", () => {
  it("builds display rows without decrements or next_game", () => {
    const rows = buildPointLogRows([
      event({ action: "increment", side: "a", scoreA: 1, scoreB: 0, scorerName: "Ada", at: "t1" }),
      event({ action: "decrement", side: "a", scoreA: 0, scoreB: 0, at: "t2" }),
      event({
        action: "set_points",
        side: "a",
        scoreA: 15,
        scoreB: 0,
        scorerName: "Ada",
        at: "t3",
      }),
      event({ action: "next_game", scoreA: 0, scoreB: 0, at: "t4" }),
      event({ action: "set", scoreA: 2, scoreB: 1, at: "t5" }),
    ]);
    expect(rows.map((r) => r.event.action)).toEqual(["increment", "set_points"]);
  });

  it("formats increment with player and team", () => {
    expect(
      describeScoreEvent(
        event({
          action: "increment",
          side: "a",
          scoreA: 1,
          scoreB: 0,
          scorerName: "Ada",
        }),
        ctx,
      ),
    ).toBe("+1 · Ada (Team Alpha) → 1:0");
  });

  it("formats set_points with jump amount from previous score", () => {
    const prev = event({
      action: "set_points",
      side: "a",
      scoreA: 15,
      scoreB: 0,
      scorerName: "Ada",
    });
    const next = event({
      action: "set_points",
      side: "a",
      scoreA: 40,
      scoreB: 0,
      scorerName: "Ada",
    });
    expect(pointAmountForEvent(next, prev)).toBe(25);
    expect(describeScoreEvent(next, ctx, prev)).toBe("+25 · Ada (Team Alpha) → 40:0");
  });

  it("does not list whole roster when scorer is missing on multi-player side", () => {
    expect(
      describeScoreEvent(
        event({ action: "increment", side: "b", scoreA: 0, scoreB: 1 }),
        ctx,
      ),
    ).toBe("+1 · Unknown player (Team Beta) → 0:1");
  });
});
