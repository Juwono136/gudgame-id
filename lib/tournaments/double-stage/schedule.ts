import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import {
  parseCallStatus,
  type MatchCallStatus,
} from "@/lib/tournaments/double-stage/schedule-view";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type ScheduleMatchKind = "group" | "bracket";

export type ScheduleUpdateInput = {
  kind: ScheduleMatchKind;
  matchId: string;
  /** ISO datetime string, or null to clear. Omit to leave unchanged. */
  scheduledAt?: string | null;
  playOrder?: number | null;
  callStatus?: MatchCallStatus | null;
  courtId?: string | null;
};

function parseScheduleDate(raw: string | null | undefined): Date | null | undefined {
  if (raw === undefined) return undefined;
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

export type ScheduleUpdateResult = {
  id: string;
  scheduledAt: string | null;
  playOrder: number | null;
  callStatus: MatchCallStatus;
  courtId: string | null;
};

/**
 * Update kickoff / Order of Play fields for a group or bracket match.
 * Completed matches cannot be changed.
 */
export async function updateTournamentMatchSchedule(
  tournament: TournamentDetail,
  input: ScheduleUpdateInput,
): Promise<ScheduleUpdateResult> {
  const scheduledAt = parseScheduleDate(input.scheduledAt);
  const db = getDb();

  const patch: Record<string, unknown> = {};
  if (scheduledAt !== undefined) patch.scheduledAt = scheduledAt;
  if (input.playOrder !== undefined) {
    patch.playOrder =
      input.playOrder == null ? null : Math.max(0, Math.floor(input.playOrder));
  }
  if (input.callStatus !== undefined) {
    patch.callStatus =
      input.callStatus == null ? "queued" : parseCallStatus(input.callStatus);
  }
  if (input.courtId !== undefined) {
    patch.courtId = input.courtId;
  }

  if (!Object.keys(patch).length) {
    throw new AppError("No schedule fields to update", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

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
      .set(patch)
      .where(eq(tournamentGroupMatches.id, match.id))
      .returning({
        id: tournamentGroupMatches.id,
        scheduledAt: tournamentGroupMatches.scheduledAt,
        playOrder: tournamentGroupMatches.playOrder,
        callStatus: tournamentGroupMatches.callStatus,
        courtId: tournamentGroupMatches.courtId,
      });
    await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
    return {
      id: updated!.id,
      scheduledAt: updated!.scheduledAt?.toISOString() ?? null,
      playOrder: updated!.playOrder ?? null,
      callStatus: parseCallStatus(updated!.callStatus),
      courtId: updated!.courtId ?? null,
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
    .set(patch)
    .where(eq(tournamentBracketMatches.id, match.id))
    .returning({
      id: tournamentBracketMatches.id,
      scheduledAt: tournamentBracketMatches.scheduledAt,
      playOrder: tournamentBracketMatches.playOrder,
      callStatus: tournamentBracketMatches.callStatus,
      courtId: tournamentBracketMatches.courtId,
    });
  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
  return {
    id: updated!.id,
    scheduledAt: updated!.scheduledAt?.toISOString() ?? null,
    playOrder: updated!.playOrder ?? null,
    callStatus: parseCallStatus(updated!.callStatus),
    courtId: updated!.courtId ?? null,
  };
}
