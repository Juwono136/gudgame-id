import {
  appendMatchScoreEvent,
  parseMatchScoreEvents,
  type MatchScoreEvent,
} from "@/lib/tournaments/scoring/match-score-events";

export type BracketMatchMetadata = {
  scoreEvents?: MatchScoreEvent[];
  rematchCount?: number;
};

export function parseBracketMatchMetadata(raw: unknown): BracketMatchMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    scoreEvents: parseMatchScoreEvents(obj.scoreEvents),
    rematchCount: typeof obj.rematchCount === "number" ? obj.rematchCount : undefined,
  };
}

export function appendBracketScoreEvent(
  existing: BracketMatchMetadata,
  event: MatchScoreEvent,
): BracketMatchMetadata {
  return {
    ...existing,
    scoreEvents: appendMatchScoreEvent(existing.scoreEvents, event),
  };
}
