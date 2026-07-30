import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_RULES_BY_UNIT,
  applyGamePointDelta,
  applyGamePointSet,
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

  it("treats golden_point as No-Ad (first deuce decides)", () => {
    const golden = { ...padelRules, gameDecider: "golden_point" as const };
    expect(isGamePointComplete(40, 20, golden)).toEqual({ complete: true, winner: "a" });
    expect(isGamePointComplete(40, 39, golden)).toEqual({ complete: true, winner: "a" });
    expect(isGamePointComplete(39, 39, golden).complete).toBe(false);
  });

  it("requires third deuce for FIP star_point before sudden death", () => {
    const star = { ...padelRules, gameDecider: "star_point" as const };
    // Before 3rd deuce: need win by 2 after threshold.
    expect(isGamePointComplete(40, 39, star, 1).complete).toBe(false);
    expect(isGamePointComplete(41, 39, star, 1)).toEqual({ complete: true, winner: "a" });
    // On/after 3rd deuce: next point wins.
    expect(isGamePointComplete(40, 39, star, 3)).toEqual({ complete: true, winner: "a" });
    expect(isGamePointComplete(39, 39, star, 3).complete).toBe(false);
  });

  it("increments deuceCount when applying points under star_point", () => {
    const star = { ...padelRules, gameDecider: "star_point" as const };
    let state = emptyMatchGameState();
    for (let i = 0; i < 39; i++) {
      const a = applyGamePointDelta(0, 0, state, "a", 1, star)!;
      state = a.gameState;
      const b = applyGamePointDelta(0, 0, state, "b", 1, star)!;
      state = b.gameState;
    }
    expect(state.currentPointsA).toBe(39);
    expect(state.currentPointsB).toBe(39);
    expect(state.deuceCount).toBe(1);
    // First deuce — next point does NOT end the game under Star Point.
    const ad = applyGamePointDelta(0, 0, state, "a", 1, star)!;
    expect(ad.gameJustWon).toBeNull();
    expect(ad.gameState.currentPointsA).toBe(40);
  });

  it("requires win-by-2 for advantage at deuce", () => {
    const adv = { ...padelRules, gameDecider: "advantage" as const };
    expect(isGamePointComplete(40, 39, adv).complete).toBe(false);
    expect(isGamePointComplete(41, 39, adv)).toEqual({ complete: true, winner: "a" });
  });

  it("uses next point at 39–39 as the deciding point for golden_point", () => {
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
    expect(isRaceToGamesMatchComplete(2, 0, padelRules).complete).toBe(false);
    expect(isRaceToGamesMatchComplete(5, 3, padelRules).complete).toBe(false);
  });

  it("rejects inflated tallies when race target is lower", () => {
    const raceTo2 = { ...padelRules, raceToGames: 2 as const };
    expect(isRaceToGamesMatchComplete(2, 0, raceTo2)).toEqual({
      complete: true,
      winner: "a",
    });
    expect(isRaceToGamesMatchComplete(4, 2, raceTo2).complete).toBe(false);
  });

  it("blocks scoring after the match is complete", () => {
    const state = emptyMatchGameState();
    expect(applyGamePointDelta(4, 1, state, "a", 1, padelRules)).toBeNull();
  });

  it("jumps intra-game points to milestone targets", () => {
    const state = emptyMatchGameState();
    const to15 = applyGamePointSet(0, 0, state, "a", 15, padelRules)!;
    expect(to15.gameState.currentPointsA).toBe(15);
    expect(to15.gameJustWon).toBeNull();

    const to40 = applyGamePointSet(0, 0, to15.gameState, "a", 40, padelRules)!;
    expect(to40.gamesA).toBe(1);
    expect(to40.gameJustWon).toBe("a");
    expect(to40.gameState.pendingGameWinner).toBe("a");
    expect(applyGamePointSet(1, 0, to40.gameState, "a", 30, padelRules)).toBeNull();
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
