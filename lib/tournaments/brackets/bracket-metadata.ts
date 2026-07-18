import {
  appendMatchScoreEvent,
  parseMatchScoreEvents,
  type MatchScoreEvent,
} from "@/lib/tournaments/scoring/match-score-events";
import {
  parseMatchGameState,
  type MatchGameState,
} from "@/lib/tournaments/scoring/game-mode";

export type BracketMatchMetadata = {
  scoreEvents?: MatchScoreEvent[];
  rematchCount?: number;
  gameState?: MatchGameState;
};

export function parseBracketMatchMetadata(raw: unknown): BracketMatchMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    scoreEvents: parseMatchScoreEvents(obj.scoreEvents),
    rematchCount: typeof obj.rematchCount === "number" ? obj.rematchCount : undefined,
    gameState: parseMatchGameState(obj.gameState) ?? undefined,
  };
}

export function appendBracketScoreEvent(
  existing: BracketMatchMetadata,
  event: MatchScoreEvent,
  gameState?: MatchGameState,
): BracketMatchMetadata {
  return {
    ...existing,
    scoreEvents: appendMatchScoreEvent(existing.scoreEvents, event),
    ...(gameState ? { gameState } : {}),
  };
}
