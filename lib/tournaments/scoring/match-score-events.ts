/**
 * Sport-agnostic point-by-point scoring log for official (and shared) tournaments.
 */

export type MatchScoreAction = "set" | "increment" | "decrement";

export type MatchScoreEvent = {
  at: string;
  userId: string;
  userName?: string;
  scoreA: number;
  scoreB: number;
  action: MatchScoreAction;
  side?: "a" | "b";
};

export const FUN_MATCH_MAX_SCORE_EVENTS = 200;
export const OFFICIAL_MAX_SCORE_EVENTS = 500;

export function appendMatchScoreEvent(
  existing: MatchScoreEvent[] | undefined,
  event: MatchScoreEvent,
  maxEvents = OFFICIAL_MAX_SCORE_EVENTS,
): MatchScoreEvent[] {
  return [...(existing ?? []), event].slice(-maxEvents);
}

export function parseMatchScoreEvents(raw: unknown): MatchScoreEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is MatchScoreEvent =>
      Boolean(e) &&
      typeof e === "object" &&
      typeof (e as MatchScoreEvent).at === "string" &&
      typeof (e as MatchScoreEvent).userId === "string" &&
      typeof (e as MatchScoreEvent).scoreA === "number" &&
      typeof (e as MatchScoreEvent).scoreB === "number",
  );
}
