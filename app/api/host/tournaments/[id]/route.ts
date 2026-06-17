import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertTournamentDeletable, assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { deleteTournament, updateTournament } from "@/lib/tournaments/service";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import { hasBracket } from "@/lib/tournaments/brackets/service";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const { id } = await params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new AppError("Invalid tournament id", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const existing = await getTournamentById(tournamentId);
    if (!existing) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!canManageTournament(roles, existing.createdBy, userId)) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }
    assertTournamentEditable(existing);

    const body = await request.json();
    const parsed = tournamentUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const tournament = await updateTournament(tournamentId, existing.sportId, parsed.data);
    return jsonSuccess({ tournament });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const { id } = await params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new AppError("Invalid tournament id", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const existing = await getTournamentById(tournamentId);
    if (!existing) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!canManageTournament(roles, existing.createdBy, userId)) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }
    assertTournamentDeletable(existing);

    const [paid] = await getDb()
      .select({ id: tournamentPayments.id })
      .from(tournamentPayments)
      .where(
        and(
          eq(tournamentPayments.tournamentId, tournamentId),
          eq(tournamentPayments.status, "paid"),
        ),
      )
      .limit(1);

    if (paid) {
      throw new AppError("Cannot delete tournament with paid registrations", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    if (await hasBracket(tournamentId)) {
      throw new AppError("Cannot delete tournament with an active bracket", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    await deleteTournament(tournamentId, existing.sportId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
