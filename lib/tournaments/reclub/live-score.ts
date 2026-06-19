import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentReclubMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import {
  appendScoreEvent,
  parseReclubMatchMetadata,
  type ReclubScoreEvent,
} from "@/lib/tournaments/reclub/score-events";
import { mapReclubMatchRow } from "@/lib/tournaments/reclub/match-mapper";

export async function updateReclubLiveScore(
  tournament: TournamentDetail,
  matchId: string,
  userId: string,
  userName: string | null,
  input: {
    scoreA: number;
    scoreB: number;
    action?: ReclubScoreEvent["action"];
    side?: ReclubScoreEvent["side"];
  },
): Promise<ReclubMatchView> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.id, matchId),
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new AppError("Active match not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const scoreA = Math.max(0, Math.min(99, input.scoreA));
  const scoreB = Math.max(0, Math.min(99, input.scoreB));
  const prevMeta = parseReclubMatchMetadata(existing.metadata);
  const event: ReclubScoreEvent = {
    at: new Date().toISOString(),
    userId,
    userName: userName ?? undefined,
    scoreA,
    scoreB,
    action: input.action ?? "set",
    side: input.side,
  };
  const metadata = appendScoreEvent(prevMeta, event);

  const [updated] = await db
    .update(tournamentReclubMatches)
    .set({ scoreA, scoreB, metadata, recordedByUserId: userId })
    .where(eq(tournamentReclubMatches.id, matchId))
    .returning();

  if (!updated) {
    throw new AppError("Could not update score", { code: "DATABASE_ERROR", statusCode: 500 });
  }

  return mapReclubMatchRow(updated);
}
