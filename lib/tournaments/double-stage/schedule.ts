import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type ScheduleMatchKind = "group" | "bracket";

export type ScheduleUpdateInput = {
  kind: ScheduleMatchKind;
  matchId: string;
  /** ISO datetime string, or null to clear */
  scheduledAt: string | null;
};

function parseScheduleDate(raw: string | null): Date | null {
  if (raw == null || raw.trim() === "") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new AppError("Invalid schedule datetime", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  return d;
}

/**
 * Set or clear scheduled kickoff for a group or bracket match.
 * Completed matches cannot have their schedule changed.
 */
export async function updateTournamentMatchSchedule(
  tournament: TournamentDetail,
  input: ScheduleUpdateInput,
): Promise<{ id: string; scheduledAt: string | null }> {
  const scheduledAt = parseScheduleDate(input.scheduledAt);
  const db = getDb();

  if (input.kind === "group") {
    if (tournament.format !== "double_stage") {
      throw new AppError("Group fixtures only exist on double stage tournaments", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }
    const [match] = await db
      .select()
      .from(tournamentGroupMatches)
      .where(
        and(
          eq(tournamentGroupMatches.id, input.matchId),
          eq(tournamentGroupMatches.tournamentId, tournament.id),
        ),
      )
      .limit(1);
    if (!match) {
      throw new AppError("Group match not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (match.status === "completed") {
      throw new AppError("Cannot reschedule a completed match", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }
    const [updated] = await db
      .update(tournamentGroupMatches)
      .set({ scheduledAt })
      .where(eq(tournamentGroupMatches.id, match.id))
      .returning({
        id: tournamentGroupMatches.id,
        scheduledAt: tournamentGroupMatches.scheduledAt,
      });
    await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
    return {
      id: updated!.id,
      scheduledAt: updated!.scheduledAt?.toISOString() ?? null,
    };
  }

  const [match] = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.id, input.matchId),
        eq(tournamentBracketMatches.tournamentId, tournament.id),
      ),
    )
    .limit(1);
  if (!match) {
    throw new AppError("Bracket match not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (match.status === "completed" || match.status === "bye") {
    throw new AppError("Cannot reschedule a finished or bye match", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
  const [updated] = await db
    .update(tournamentBracketMatches)
    .set({ scheduledAt })
    .where(eq(tournamentBracketMatches.id, match.id))
    .returning({
      id: tournamentBracketMatches.id,
      scheduledAt: tournamentBracketMatches.scheduledAt,
    });
  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
  return {
    id: updated!.id,
    scheduledAt: updated!.scheduledAt?.toISOString() ?? null,
  };
}
