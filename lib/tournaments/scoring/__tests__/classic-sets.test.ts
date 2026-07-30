import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIP_PADEL_SETS,
  DEFAULT_ITF_TENNIS_SETS,
  applyClassicSetPointDelta,
  computeRetirementScore,
  computeWalkoverScore,
  isClassicMatchComplete,
  isSetComplete,
  isTiebreakComplete,
  startNextClassicAfterWin,
  emptyClassicMatchGameState,
} from "@/lib/tournaments/scoring/classic-sets";
import type { MatchGameRules } from "@/lib/tournaments/scoring/game-mode";

const goldenRules: MatchGameRules = {
  raceToGames: 2,
  pointsToWinGame: 40,
  gameDecider: "golden_point",
  pointStyle: "simple",
};

function winGame(
  setsA: number,
  setsB: number,
  state: ReturnType<typeof emptyClassicMatchGameState>,
  side: "a" | "b",
) {
  let sA = setsA;
  let sB = setsB;
  let st = state;
  // Jump to 40 via repeated +1 from 0 (40 points) — heavy; use loop to 40 for winner, 0 for loser
  for (let i = 0; i < 40; i++) {
    const r = applyClassicSetPointDelta(sA, sB, st, side, 1, goldenRules, DEFAULT_ITF_TENNIS_SETS);
    expect(r).not.toBeNull();
    st = r!.gameState;
    sA = r!.setsA;
    sB = r!.setsB;
    if (r!.gameJustWon) {
      const next = startNextClassicAfterWin(sA, sB, st, DEFAULT_ITF_TENNIS_SETS);
      expect(next).not.toBeNull();
      return next!;
    }
  }
  throw new Error("game did not complete");
}

describe("ITF set completion", () => {
  it("wins set at 6–4", () => {
    const r = isSetComplete(6, 4, DEFAULT_ITF_TENNIS_SETS);
    expect(r.complete).toBe(true);
    expect(r.winner).toBe("a");
  });

  it("requires win-by-2 at 6–5", () => {
    expect(isSetComplete(6, 5, DEFAULT_ITF_TENNIS_SETS).complete).toBe(false);
    expect(isSetComplete(7, 5, DEFAULT_ITF_TENNIS_SETS).complete).toBe(true);
  });

  it("needs tiebreak at 6–6", () => {
    const r = isSetComplete(6, 6, DEFAULT_ITF_TENNIS_SETS);
    expect(r.needsTiebreak).toBe(true);
    expect(r.complete).toBe(false);
  });
});

describe("ITF set tiebreak", () => {
  it("wins TB at 7–5", () => {
    const r = isTiebreakComplete(7, 5, 7, 2);
    expect(r.complete).toBe(true);
    expect(r.winner).toBe("a");
  });

  it("continues at 7–6 until win-by-2", () => {
    expect(isTiebreakComplete(7, 6, 7, 2).complete).toBe(false);
    expect(isTiebreakComplete(8, 6, 7, 2).complete).toBe(true);
  });
});

describe("FIP super tiebreak", () => {
  it("uses STB to 10 with win-by-2", () => {
    expect(isTiebreakComplete(10, 8, 10, 2).complete).toBe(true);
    expect(isTiebreakComplete(10, 9, 10, 2).complete).toBe(false);
    expect(isTiebreakComplete(12, 10, 10, 2).complete).toBe(true);
  });

  it("padel defaults use super_tiebreak deciding set", () => {
    expect(DEFAULT_FIP_PADEL_SETS.decidingSetMode).toBe("super_tiebreak");
    expect(DEFAULT_ITF_TENNIS_SETS.decidingSetMode).toBe("full_set");
  });
});

describe("classic match complete", () => {
  it("best of 3 ends at 2 sets", () => {
    expect(isClassicMatchComplete(2, 0, DEFAULT_ITF_TENNIS_SETS).winner).toBe("a");
    expect(isClassicMatchComplete(2, 1, DEFAULT_ITF_TENNIS_SETS).winner).toBe("a");
    expect(isClassicMatchComplete(1, 1, DEFAULT_ITF_TENNIS_SETS).complete).toBe(false);
  });
});

describe("walkover & retirement", () => {
  it("walkover awards 6–0 sets to match win", () => {
    const wo = computeWalkoverScore("a", DEFAULT_ITF_TENNIS_SETS);
    expect(wo.setsA).toBe(2);
    expect(wo.setsB).toBe(0);
    expect(wo.setScores).toEqual([
      { gamesA: 6, gamesB: 0 },
      { gamesA: 6, gamesB: 0 },
    ]);
  });

  it("retirement finishes current set then WO remaining", () => {
    const ret = computeRetirementScore(
      "b",
      { setsA: 0, setsB: 0, gamesInSetA: 3, gamesInSetB: 4, setScores: [] },
      DEFAULT_ITF_TENNIS_SETS,
    );
    expect(ret.setsB).toBe(2);
    expect(ret.setScores[0]!.gamesB).toBeGreaterThanOrEqual(6);
    expect(ret.setScores[0]!.gamesB - ret.setScores[0]!.gamesA).toBeGreaterThanOrEqual(2);
  });
});

describe("live classic point flow smoke", () => {
  it("winning 6 games wins a set", () => {
    let setsA = 0;
    let setsB = 0;
    let state = emptyClassicMatchGameState();
    for (let g = 0; g < 6; g++) {
      const next = winGame(setsA, setsB, state, "a");
      setsA = next.setsA;
      setsB = next.setsB;
      state = next.gameState;
      if (next.setJustWon) break;
    }
    expect(setsA).toBe(1);
    expect(setsB).toBe(0);
  });
});
