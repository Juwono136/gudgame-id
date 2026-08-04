import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { hasBracket } from "@/lib/tournaments/brackets/service";
import {
  assertTournamentDeletable,
  assertTournamentEditable,
} from "@/lib/tournaments/manage-policy";
import { assertCanEditTournamentSettings } from "@/lib/tournaments/manage-access";
import { deleteTournament, updateTournament } from "@/lib/tournaments/service";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const tournamentId = parseEntityIdParam((await params).id, "tournament id");

    const existing = await getTournamentById(tournamentId);
    if (!existing) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    await assertCanEditTournamentSettings(existing, userId, roles);
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
    const { userId, roles } = await requireApiRoleGuardContext();
    const tournamentId = parseEntityIdParam((await params).id, "tournament id");

    const existing = await getTournamentById(tournamentId);
    if (!existing) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    await assertCanEditTournamentSettings(existing, userId, roles);
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
