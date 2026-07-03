import type { MatchScoreEvent, MatchScoreAction } from "@/lib/tournaments/scoring/match-score-events";
import {
  appendMatchScoreEvent,
  FUN_MATCH_MAX_SCORE_EVENTS,
  parseMatchScoreEvents,
} from "@/lib/tournaments/scoring/match-score-events";

/** @deprecated Use MatchScoreEvent */
export type ReclubScoreEvent = MatchScoreEvent;

export type ReclubMatchMetadata = {
  scoreEvents?: MatchScoreEvent[];
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  playType?: "round" | "friendly" | "bracket" | "bracket_rematch";
  playNumber?: number;
  bracketMatchId?: string;
  bracketMatchNumber?: number;
  roundLabel?: string;
  source?: string;
};

export function parseReclubMatchMetadata(raw: unknown): ReclubMatchMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const scoreEvents = parseMatchScoreEvents(obj.scoreEvents);
  const playType = obj.playType;
  return {
    scoreEvents,
    teamAPlayers: Array.isArray(obj.teamAPlayers)
      ? (obj.teamAPlayers as string[])
      : undefined,
    teamBPlayers: Array.isArray(obj.teamBPlayers)
      ? (obj.teamBPlayers as string[])
      : undefined,
    playType:
      playType === "round" ||
      playType === "friendly" ||
      playType === "bracket" ||
      playType === "bracket_rematch"
        ? playType
        : undefined,
    playNumber: typeof obj.playNumber === "number" ? obj.playNumber : undefined,
    bracketMatchId:
      typeof obj.bracketMatchId === "string" ? obj.bracketMatchId : undefined,
    bracketMatchNumber:
      typeof obj.bracketMatchNumber === "number" ? obj.bracketMatchNumber : undefined,
    roundLabel: typeof obj.roundLabel === "string" ? obj.roundLabel : undefined,
    source: typeof obj.source === "string" ? obj.source : undefined,
  };
}

export function appendScoreEvent(
  existing: ReclubMatchMetadata,
  event: MatchScoreEvent,
): ReclubMatchMetadata {
  return {
    ...existing,
    scoreEvents: appendMatchScoreEvent(existing.scoreEvents, event, FUN_MATCH_MAX_SCORE_EVENTS),
  };
}

export type { MatchScoreAction };
