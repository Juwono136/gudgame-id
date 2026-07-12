import type { MatchScoreEvent, ScoreChangeMeta } from "@/lib/tournaments/scoring/match-score-events";

export function buildMatchScoreEvent(
  userId: string,
  userName: string | null,
  scoreA: number,
  scoreB: number,
  meta: ScoreChangeMeta = {},
): MatchScoreEvent {
  return {
    at: new Date().toISOString(),
    userId,
    userName: userName ?? undefined,
    scoreA,
    scoreB,
    action: meta.action ?? "set",
    side: meta.side,
    scorerName: meta.scorerName?.trim() || undefined,
    scorerUserId: meta.scorerUserId,
  };
}
