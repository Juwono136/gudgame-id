import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_RULES_BY_UNIT,
  applyGamePointDelta,
  countCompletedRallies,
  emptyMatchGameState,
  formatIntraGamePoint,
  isGamePointComplete,
  isRaceToGamesMatchComplete,
  nextRallyTarget,
  reconcileMatchGamesScores,
  startNextGameAfterWin,
} from "@/lib/tournaments/scoring/game-mode";

const padelRules = DEFAULT_GAME_RULES_BY_UNIT.games;

describe("game-mode scoring", () => {
  it("formats simple sequential point labels by default", () => {
    expect(formatIntraGamePoint(0)).toBe("0");
    expect(formatIntraGamePoint(1)).toBe("1");
    expect(formatIntraGamePoint(15)).toBe("15");
    expect(formatIntraGamePoint(30)).toBe("30");
    expect(formatIntraGamePoint(40)).toBe("40");
  });

  it("tracks rally milestones at 15 / 30 / 40", () => {
    expect(countCompletedRallies(0)).toBe(0);
    expect(countCompletedRallies(14)).toBe(0);
    expect(countCompletedRallies(15)).toBe(1);
    expect(countCompletedRallies(29)).toBe(1);
    expect(countCompletedRallies(30)).toBe(2);
    expect(countCompletedRallies(40)).toBe(3);
    expect(nextRallyTarget(0)).toBe(15);
    expect(nextRallyTarget(15)).toBe(30);
    expect(nextRallyTarget(30)).toBe(40);
    expect(nextRallyTarget(40)).toBeNull();
  });

  it("awards a game at 40 but holds the score until next game", () => {
    let gamesA = 0;
    let gamesB = 0;
    let state = emptyMatchGameState();

    for (let i = 0; i < 39; i++) {
      const a = applyGamePointDelta(gamesA, gamesB, state, "a", 1, padelRules)!;
      gamesA = a.gamesA;
      gamesB = a.gamesB;
      state = a.gameState;
      expect(a.gameJustWon).toBeNull();
    }
    expect(state.currentPointsA).toBe(39);
    expect(isGamePointComplete(39, 0, padelRules).complete).toBe(false);

    const win = applyGamePointDelta(gamesA, gamesB, state, "a", 1, padelRules)!;
    expect(win.gamesA).toBe(1);
    expect(win.gamesB).toBe(0);
    expect(win.gameJustWon).toBe("a");
    expect(win.gameState.currentPointsA).toBe(40);
    expect(win.gameState.currentPointsB).toBe(0);
    expect(win.gameState.pendingGameWinner).toBe("a");

    // Further + blocked while held.
    expect(
      applyGamePointDelta(win.gamesA, win.gamesB, win.gameState, "a", 1, padelRules),
    ).toBeNull();

    const next = startNextGameAfterWin(win.gameState)!;
    expect(next.currentPointsA).toBe(0);
    expect(next.currentPointsB).toBe(0);
    expect(next.pendingGameWinner).toBeNull();
    expect(next.completedGames).toHaveLength(1);
  });

  it("uses next point at 39–39 as the deciding point (no separate deuce UI)", () => {
    const gamesA = 0;
    const gamesB = 0;
    let state = emptyMatchGameState();

    for (let i = 0; i < 39; i++) {
      const a = applyGamePointDelta(gamesA, gamesB, state, "a", 1, padelRules)!;
      state = a.gameState;
      const b = applyGamePointDelta(gamesA, gamesB, state, "b", 1, padelRules)!;
      state = b.gameState;
    }
    expect(state.currentPointsA).toBe(39);
    expect(state.currentPointsB).toBe(39);

    const win = applyGamePointDelta(gamesA, gamesB, state, "a", 1, padelRules)!;
    expect(win.gamesA).toBe(1);
    expect(win.gameJustWon).toBe("a");
    expect(win.gameState.currentPointsA).toBe(40);
    expect(win.gameState.pendingGameWinner).toBe("a");
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

  it("reconciles games won from completedGames when column scores drift", () => {
    const reconciled = reconcileMatchGamesScores(0, 0, {
      currentPointsA: 0,
      currentPointsB: 0,
      completedGames: [
        { pointsA: 40, pointsB: 12 },
        { pointsA: 40, pointsB: 28 },
        { pointsA: 22, pointsB: 40 },
      ],
    });
    expect(reconciled).toEqual({ scoreA: 2, scoreB: 1 });
  });
});
