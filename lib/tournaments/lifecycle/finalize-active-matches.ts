import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";

type FinalizeReason = "completed" | "cancelled";

/**
 * Close any in-progress bracket/reclub rows when a tournament ends.
 * Idempotent — only touches rows still marked in_progress.
 */
export async function finalizeStaleActiveMatches(
  tournamentId: string,
  reason: FinalizeReason,
): Promise<{ bracketClosed: number; reclubClosed: number }> {
  void reason;
  const db = getDb();
  const endedAt = new Date();

  const inProgressBracket = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        eq(tournamentBracketMatches.status, "in_progress"),
      ),
    );

  for (const match of inProgressBracket) {
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    let winnerTeamId = match.winnerTeamId;
    if (!winnerTeamId && scoreA !== scoreB) {
      winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
    }

    await db
      .update(tournamentBracketMatches)
      .set({
        status: "completed",
        completedAt: match.completedAt ?? endedAt,
        winnerTeamId,
        courtId: null,
        timerEndsAt: null,
      })
      .where(eq(tournamentBracketMatches.id, match.id));
  }

  const inProgressReclub = await db
    .select()
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournamentId),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    );

  for (const match of inProgressReclub) {
    const startedAt = match.startedAt ?? match.createdAt;
    const durationSeconds =
      match.durationSeconds ??
      (startedAt
        ? Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
        : null);

    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const summary =
      match.summary?.trim() ||
      `${match.teamAName ?? "Team A"} ${scoreA}–${scoreB} ${match.teamBName ?? "Team B"}`;

    await db
      .update(tournamentReclubMatches)
      .set({
        status: "completed",
        endedAt: match.endedAt ?? endedAt,
        durationSeconds,
        summary,
        courtId: null,
        timerEndsAt: null,
      })
      .where(eq(tournamentReclubMatches.id, match.id));
  }

  return {
    bracketClosed: inProgressBracket.length,
    reclubClosed: inProgressReclub.length,
  };
}

/** Fast existence check before running finalize (avoids unnecessary writes). */
export async function hasStaleActiveMatches(tournamentId: string): Promise<boolean> {
  const db = getDb();
  const [bracketRow] = await db
    .select({ id: tournamentBracketMatches.id })
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        eq(tournamentBracketMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  if (bracketRow) return true;

  const [reclubRow] = await db
    .select({ id: tournamentReclubMatches.id })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournamentId),
        eq(tournamentReclubMatches.status, "in_progress"),
      ),
    )
    .limit(1);

  return Boolean(reclubRow);
}

export async function finalizeStaleActiveMatchesIfNeeded(
  tournamentId: string,
  tournamentStatus: string,
  sportSlug?: string,
  slug?: string,
): Promise<void> {
  if (tournamentStatus !== "completed" && tournamentStatus !== "cancelled") return;
  if (!(await hasStaleActiveMatches(tournamentId))) return;

  await finalizeStaleActiveMatches(
    tournamentId,
    tournamentStatus === "cancelled" ? "cancelled" : "completed",
  );

  if (sportSlug && slug) {
    const { invalidateTournamentCaches } = await import("@/lib/tournaments/cache");
    await invalidateTournamentCaches(sportSlug, slug);
  }
}
