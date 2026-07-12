import { formatPlayerNameList, uniquePlayerNames } from "@/lib/format/player-names";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";

export type PointLogMatchContext = {
  teamAName?: string | null;
  teamBName?: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
};

function playersForSide(
  side: "a" | "b" | undefined,
  context?: PointLogMatchContext,
): string[] {
  if (!side) return [];
  const raw = side === "a" ? context?.teamAPlayers : context?.teamBPlayers;
  return uniquePlayerNames(raw);
}

/** Resolve the player label shown for a scoring event (never generic Team A/B). */
export function resolveScoreEventScorerLabel(
  event: MatchScoreEvent,
  context?: PointLogMatchContext,
): string {
  const trimmedScorer = event.scorerName?.trim();
  if (trimmedScorer) return trimmedScorer;

  const sidePlayers = playersForSide(event.side, context);
  if (sidePlayers.length === 1) return sidePlayers[0]!;

  if (event.action === "increment" || event.action === "decrement") {
    const playerLine = formatPlayerNameList(sidePlayers);
    if (playerLine) return playerLine;
  }

  return "Scorer";
}

export function describeScoreEvent(
  event: MatchScoreEvent,
  context?: PointLogMatchContext,
): string {
  if (event.action === "increment" && event.side) {
    return `+1 · ${resolveScoreEventScorerLabel(event, context)} → ${event.scoreA}:${event.scoreB}`;
  }
  if (event.action === "decrement" && event.side) {
    return `−1 · ${resolveScoreEventScorerLabel(event, context)} → ${event.scoreA}:${event.scoreB}`;
  }
  return `Score set to ${event.scoreA}:${event.scoreB}`;
}
