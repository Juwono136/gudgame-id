import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";

export type ScoreRevisionLike = {
  seq: number;
  action: string;
  scoreAAfter: number;
  scoreBAfter: number;
  side: "a" | "b" | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
};

/** Convert revisions into MatchScoreEvent-shaped rows for manage audit UI. */
export function revisionsToAuditScoreEvents(
  revisions: ScoreRevisionLike[],
): MatchScoreEvent[] {
  return [...revisions]
    .sort((a, b) => a.seq - b.seq)
    .filter((r) => r.action === "decrement" || r.action === "set")
    .map((r) => ({
      at: r.createdAt,
      userId: r.actorUserId ?? "system",
      userName: r.actorName ?? undefined,
      scoreA: r.scoreAAfter,
      scoreB: r.scoreBAfter,
      action: r.action as MatchScoreEvent["action"],
      side: r.side ?? undefined,
      scorerName: r.actorName ?? undefined,
      scorerUserId: r.actorUserId ?? undefined,
    }));
}
