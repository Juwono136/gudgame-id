import { uniquePlayerNames } from "@/lib/format/player-names";
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

export function teamNameForSide(
  side: "a" | "b" | undefined,
  context?: PointLogMatchContext,
): string | null {
  if (!side) return null;
  const name = side === "a" ? context?.teamAName : context?.teamBName;
  const trimmed = name?.trim();
  return trimmed || null;
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

  return "Unknown player";
}

/**
 * Point-log entries shown to hosts/public: positive scoring only.
 * Decrements, next-game resets, and opaque absolute sets are hidden.
 */
export function isDisplayedPointLogEvent(event: MatchScoreEvent): boolean {
  if (event.action === "increment") return Boolean(event.side);
  if (event.action === "set_points") return Boolean(event.side);
  return false;
}

export function filterPointLogEvents(events: MatchScoreEvent[]): MatchScoreEvent[] {
  return events.filter(isDisplayedPointLogEvent);
}

/** Points credited by this event relative to the previous displayed/raw event. */
export function pointAmountForEvent(
  event: MatchScoreEvent,
  previous?: MatchScoreEvent | null,
): number {
  if (event.action === "increment") return 1;
  if (event.action === "set_points" && event.side) {
    const prevSideScore =
      event.side === "a" ? (previous?.scoreA ?? 0) : (previous?.scoreB ?? 0);
    const nextSideScore = event.side === "a" ? event.scoreA : event.scoreB;
    return Math.max(0, nextSideScore - prevSideScore);
  }
  return 0;
}

/**
 * Human-readable point log line:
 * `+15 · Player Name (Team Name) → 15:0`
 */
export function describeScoreEvent(
  event: MatchScoreEvent,
  context?: PointLogMatchContext,
  previous?: MatchScoreEvent | null,
): string {
  if (event.action === "next_game") {
    return `Next game · points reset → ${event.scoreA}:${event.scoreB}`;
  }
  if (event.action === "decrement" && event.side) {
    return `−1 · ${resolveScoreEventScorerLabel(event, context)} → ${event.scoreA}:${event.scoreB}`;
  }

  const amount = pointAmountForEvent(event, previous);
  const scorer = resolveScoreEventScorerLabel(event, context);
  const team = teamNameForSide(event.side, context);
  const who = team ? `${scorer} (${team})` : scorer;

  if (
    (event.action === "increment" || event.action === "set_points") &&
    event.side &&
    amount > 0
  ) {
    return `+${amount} · ${who} → ${event.scoreA}:${event.scoreB}`;
  }

  if ((event.action === "increment" || event.action === "set_points") && event.side) {
    return `+0 · ${who} → ${event.scoreA}:${event.scoreB}`;
  }

  return `Score set to ${event.scoreA}:${event.scoreB}`;
}

export type PointLogRow = {
  event: MatchScoreEvent;
  previous: MatchScoreEvent | null;
};

/** Chronological positive-scoring rows for official/public point logs. */
export function buildPointLogRows(events: MatchScoreEvent[]): PointLogRow[] {
  const chronological = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const out: PointLogRow[] = [];
  for (let i = 0; i < chronological.length; i++) {
    const event = chronological[i]!;
    if (!isDisplayedPointLogEvent(event)) continue;
    const previous = i > 0 ? chronological[i - 1]! : null;
    if (pointAmountForEvent(event, previous) <= 0) continue;
    out.push({ event, previous });
  }
  return out;
}
