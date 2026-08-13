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
  /** Knockout series: parent slot id (leg rows only). */
  seriesParentId?: string;
  /** 1-based leg index within the series. */
  legIndex?: number;
  /** Total legs required for majority. */
  legsRequired?: number;
  /** True on the primary slot row that holds nextMatchId. */
  isSeriesSlot?: boolean;
  phase?: string;
};

export function parseBracketMatchMetadata(raw: unknown): BracketMatchMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    scoreEvents: parseMatchScoreEvents(obj.scoreEvents),
    rematchCount: typeof obj.rematchCount === "number" ? obj.rematchCount : undefined,
    gameState: parseMatchGameState(obj.gameState) ?? undefined,
    seriesParentId:
      typeof obj.seriesParentId === "string" ? obj.seriesParentId : undefined,
    legIndex: typeof obj.legIndex === "number" ? obj.legIndex : undefined,
    legsRequired: typeof obj.legsRequired === "number" ? obj.legsRequired : undefined,
    isSeriesSlot: typeof obj.isSeriesSlot === "boolean" ? obj.isSeriesSlot : undefined,
    phase: typeof obj.phase === "string" ? obj.phase : undefined,
  };
}

/**
 * Child legs of a multi-leg KO series must not inflate bracket leaderboards —
 * only the series slot (parent) counts as one W/L when the series completes.
 */
export function isBracketSeriesChildLeg(metadata: unknown): boolean {
  const meta = parseBracketMatchMetadata(metadata);
  return typeof meta.seriesParentId === "string" && meta.seriesParentId.length > 0;
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
