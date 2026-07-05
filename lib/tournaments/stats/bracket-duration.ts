import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";

export type BracketDurationSource = {
  status: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  startedAt?: string | null;
  scoreEvents?: MatchScoreEvent[];
};

function durationFromIsoRange(startIso: string, endIso: string): number | null {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.max(1, Math.round((end - start) / 1000));
}

function durationFromScoreEvents(
  events: MatchScoreEvent[],
  endIso?: string | null,
): number | null {
  if (!events.length) return null;

  const first = events[0]?.at;
  if (!first) return null;

  const last = endIso ?? events[events.length - 1]?.at;
  if (!last) return null;

  return durationFromIsoRange(first, last);
}

/** Derive match length for completed bracket rows when duration_seconds is not stored. */
export function resolveBracketMatchDurationSeconds(
  match: BracketDurationSource,
): number | null {
  if (match.status !== "completed") return null;

  const startIso = match.scheduledAt ?? match.startedAt;
  if (startIso && match.completedAt) {
    return durationFromIsoRange(startIso, match.completedAt);
  }

  const events = match.scoreEvents?.filter((event) => event.at) ?? [];
  if (events.length) {
    return durationFromScoreEvents(events, match.completedAt);
  }

  return null;
}
