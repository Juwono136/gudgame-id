import {
  applyGamePointDelta,
  emptyMatchGameState,
  startNextGameAfterWin,
  DEFAULT_GAME_RULES_BY_UNIT,
} from "../lib/tournaments/scoring/game-mode";

const rules = DEFAULT_GAME_RULES_BY_UNIT.games;
let state = emptyMatchGameState();
let gA = 0;
let gB = 0;
for (let i = 0; i < 40; i++) {
  const r = applyGamePointDelta(gA, gB, state, "a", 1, rules)!;
  gA = r.gamesA;
  gB = r.gamesB;
  state = r.gameState;
}
console.log("pending", state.pendingGameWinner, "pts", state.currentPointsA, "games", gA);
console.log("next", startNextGameAfterWin(state));
