/**
 * Sport-agnostic point-by-point scoring log for official (and shared) tournaments.
 */

export type MatchScoreAction =
  | "set"
  | "set_points"
  | "increment"
  | "decrement"
  | "next_game";

export type MatchScoreEvent = {
  at: string;
  userId: string;
  userName?: string;
  /** Player who scored the point (display name). */
  scorerName?: string;
  /** Player who scored the point (when known). */
  scorerUserId?: string;
  scoreA: number;
  scoreB: number;
  action: MatchScoreAction;
  side?: "a" | "b";
};

export type ScoreChangeMeta = {
  action?: MatchScoreAction;
  side?: "a" | "b";
  scorerName?: string;
  scorerUserId?: string;
};

/** UI callback options when adjusting live scores. */
export type ScoreAdjustOptions = Pick<ScoreChangeMeta, "scorerName" | "scorerUserId">;

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

export type ScorerPointTotal = {
  key: string;
  displayName: string;
  points: number;
};

/** Aggregate attributed live points from the match score log (phase-1 scorer stats). */
export function aggregateScorerPoints(events: MatchScoreEvent[]): ScorerPointTotal[] {
  const totals = new Map<string, ScorerPointTotal>();
  let prevA = 0;
  let prevB = 0;

  for (const event of events) {
    const side = event.side;
    const key = event.scorerUserId ?? event.scorerName;
    const displayName = event.scorerName ?? "Player";

    let credited = 0;
    if (event.action === "increment" && side) {
      credited = 1;
    } else if (event.action === "set_points" && side) {
      const next = side === "a" ? event.scoreA : event.scoreB;
      const prev = side === "a" ? prevA : prevB;
      credited = Math.max(0, next - prev);
    }

    if (key && credited > 0) {
      const current = totals.get(key) ?? { key, displayName, points: 0 };
      current.points += credited;
      current.displayName = displayName;
      totals.set(key, current);
    }

    prevA = event.scoreA;
    prevB = event.scoreB;
  }

  return [...totals.values()].sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
}
