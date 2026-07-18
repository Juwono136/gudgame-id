import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_RULES_BY_UNIT,
  applyGamePointDelta,
  emptyMatchGameState,
  formatIntraGamePoint,
  formatIntraGameScoreLine,
  isGamePointComplete,
  isRaceToGamesMatchComplete,
} from "@/lib/tournaments/scoring/game-mode";

const padelRules = DEFAULT_GAME_RULES_BY_UNIT.games;

describe("game-mode scoring", () => {
  it("formats tennis-style point labels", () => {
    expect(formatIntraGamePoint(0)).toBe("0");
    expect(formatIntraGamePoint(1)).toBe("15");
    expect(formatIntraGamePoint(2)).toBe("30");
    expect(formatIntraGamePoint(3)).toBe("40");
    expect(formatIntraGamePoint(4)).toBe("Ad");
  });

  it("formats deuce rally line", () => {
    expect(formatIntraGameScoreLine(3, 3)).toBe("40 – 40");
    expect(formatIntraGameScoreLine(4, 3)).toBe("Ad – 40");
  });

  it("awards a game at 40 with golden point from deuce", () => {
    let gamesA = 0;
    let gamesB = 0;
    let state = emptyMatchGameState();

    // Build to 40–40 (3–3 points)
    for (let i = 0; i < 3; i++) {
      const a = applyGamePointDelta(gamesA, gamesB, state, "a", 1, padelRules)!;
      gamesA = a.gamesA;
      gamesB = a.gamesB;
      state = a.gameState;
      const b = applyGamePointDelta(gamesA, gamesB, state, "b", 1, padelRules)!;
      gamesA = b.gamesA;
      gamesB = b.gamesB;
      state = b.gameState;
    }
    expect(state.currentPointsA).toBe(3);
    expect(state.currentPointsB).toBe(3);
    expect(isGamePointComplete(3, 3, padelRules).complete).toBe(false);

    const win = applyGamePointDelta(gamesA, gamesB, state, "a", 1, padelRules)!;
    expect(win.gamesA).toBe(1);
    expect(win.gamesB).toBe(0);
    expect(win.gameJustWon).toBe("a");
    expect(win.gameState.currentPointsA).toBe(0);
    expect(win.gameState.currentPointsB).toBe(0);
  });

  it("ends the match at race to 4", () => {
    expect(isRaceToGamesMatchComplete(4, 1, padelRules)).toEqual({
      complete: true,
      winner: "a",
    });
    expect(isRaceToGamesMatchComplete(3, 2, padelRules).complete).toBe(false);
  });

  it("blocks scoring after the match is complete", () => {
    const state = emptyMatchGameState();
    expect(applyGamePointDelta(4, 1, state, "a", 1, padelRules)).toBeNull();
  });

  it("simulates Adm Team 4–1 path with tennis points", () => {
    let gamesA = 0;
    let gamesB = 0;
    let state = emptyMatchGameState();

    const winGame = (side: "a" | "b") => {
      for (let i = 0; i < 4; i++) {
        const next = applyGamePointDelta(gamesA, gamesB, state, side, 1, padelRules)!;
        gamesA = next.gamesA;
        gamesB = next.gamesB;
        state = next.gameState;
      }
    };

    winGame("a"); // 1-0
    winGame("a"); // 2-0
    winGame("b"); // 2-1
    winGame("a"); // 3-1
    winGame("a"); // 4-1

    expect(gamesA).toBe(4);
    expect(gamesB).toBe(1);
    expect(isRaceToGamesMatchComplete(gamesA, gamesB, padelRules).complete).toBe(true);
  });
});
