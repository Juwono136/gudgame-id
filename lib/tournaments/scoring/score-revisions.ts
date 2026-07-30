import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  matchScoreRevisions,
  type MatchScoreRevisionAction,
  type MatchScoreRevisionKind,
} from "@/db/schema/match-score-revisions";
import type { MatchScoreEvent } from "@/lib/tournaments/scoring/match-score-events";
import { revisionsToAuditScoreEvents } from "@/lib/tournaments/scoring/revision-audit";

export type RecordScoreRevisionInput = {
  tournamentId: string;
  matchKind: MatchScoreRevisionKind;
  matchId: string;
  action: MatchScoreRevisionAction | MatchScoreEvent["action"];
  scoreABefore: number;
  scoreBBefore: number;
  scoreAAfter: number;
  scoreBAfter: number;
  side?: "a" | "b" | null;
  gameState?: unknown;
  actorUserId?: string | null;
  actorName?: string | null;
  reason?: string | null;
};

export type ScoreRevisionView = {
  id: string;
  matchKind: MatchScoreRevisionKind;
  matchId: string;
  seq: number;
  action: string;
  scoreABefore: number;
  scoreBBefore: number;
  scoreAAfter: number;
  scoreBAfter: number;
  side: "a" | "b" | null;
  actorUserId: string | null;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
};

/**
 * Append an immutable score revision. Seq is max(seq)+1 per match.
 * Failures are swallowed after log so scoring UX is never blocked by audit write.
 */
export async function recordMatchScoreRevision(
  input: RecordScoreRevisionInput,
): Promise<void> {
  const db = getDb();
  try {
    const [maxRow] = await db
      .select({ maxSeq: sql<number>`coalesce(max(${matchScoreRevisions.seq}), 0)` })
      .from(matchScoreRevisions)
      .where(
        and(
          eq(matchScoreRevisions.matchKind, input.matchKind),
          eq(matchScoreRevisions.matchId, input.matchId),
        ),
      );

    const nextSeq = Number(maxRow?.maxSeq ?? 0) + 1;

    await db.insert(matchScoreRevisions).values({
      tournamentId: input.tournamentId,
      matchKind: input.matchKind,
      matchId: input.matchId,
      seq: nextSeq,
      action: input.action,
      scoreABefore: input.scoreABefore,
      scoreBBefore: input.scoreBBefore,
      scoreAAfter: input.scoreAAfter,
      scoreBAfter: input.scoreBAfter,
      side: input.side ?? null,
      gameState: input.gameState ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      reason: input.reason ?? null,
    });
  } catch (err) {
    console.error("[match-score-revisions] failed to record", {
      matchId: input.matchId,
      action: input.action,
      err,
    });
  }
}

export async function listMatchScoreRevisions(params: {
  tournamentId: string;
  matchKind?: MatchScoreRevisionKind;
  matchId?: string;
  limit?: number;
}): Promise<ScoreRevisionView[]> {
  const db = getDb();
  const conditions = [eq(matchScoreRevisions.tournamentId, params.tournamentId)];
  if (params.matchKind) {
    conditions.push(eq(matchScoreRevisions.matchKind, params.matchKind));
  }
  if (params.matchId) {
    conditions.push(eq(matchScoreRevisions.matchId, params.matchId));
  }

  const rows = await db
    .select()
    .from(matchScoreRevisions)
    .where(and(...conditions))
    .orderBy(desc(matchScoreRevisions.createdAt), desc(matchScoreRevisions.seq))
    .limit(Math.min(params.limit ?? 200, 500));

  return rows.map((r) => ({
    id: r.id,
    matchKind: r.matchKind as MatchScoreRevisionKind,
    matchId: r.matchId,
    seq: r.seq,
    action: r.action,
    scoreABefore: r.scoreABefore,
    scoreBBefore: r.scoreBBefore,
    scoreAAfter: r.scoreAAfter,
    scoreBAfter: r.scoreBAfter,
    side: r.side === "a" || r.side === "b" ? r.side : null,
    actorUserId: r.actorUserId,
    actorName: r.actorName,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Convert revisions into MatchScoreEvent-shaped rows for manage audit UI. */
export { revisionsToAuditScoreEvents } from "@/lib/tournaments/scoring/revision-audit";

export async function listMatchScoreRevisionsAscending(params: {
  tournamentId: string;
  matchKind: MatchScoreRevisionKind;
  matchId: string;
}): Promise<ScoreRevisionView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(matchScoreRevisions)
    .where(
      and(
        eq(matchScoreRevisions.tournamentId, params.tournamentId),
        eq(matchScoreRevisions.matchKind, params.matchKind),
        eq(matchScoreRevisions.matchId, params.matchId),
      ),
    )
    .orderBy(asc(matchScoreRevisions.seq));

  return rows.map((r) => ({
    id: r.id,
    matchKind: r.matchKind as MatchScoreRevisionKind,
    matchId: r.matchId,
    seq: r.seq,
    action: r.action,
    scoreABefore: r.scoreABefore,
    scoreBBefore: r.scoreBBefore,
    scoreAAfter: r.scoreAAfter,
    scoreBAfter: r.scoreBAfter,
    side: r.side === "a" || r.side === "b" ? r.side : null,
    actorUserId: r.actorUserId,
    actorName: r.actorName,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  }));
}
