import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { hasBracket } from "@/lib/tournaments/brackets/service";
import {
  assertTournamentDeletable,
  assertTournamentEditable,
} from "@/lib/tournaments/manage-policy";
import { deleteTournament, updateTournament } from "@/lib/tournaments/service";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

async function requireOwnedTournament(id: string, sportId: string, userId: string) {
  const tournament = await getTournamentById(id);
  if (!tournament || tournament.sportId !== sportId) {
    throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  if (tournament.createdBy !== userId) {
    throw new AppError("You can only manage tournaments you created", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return tournament;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireWikiManagementAccess();
    const id = parseEntityIdParam((await params).id, "tournament id");

    const existing = await requireOwnedTournament(id, ctx.sportId, ctx.userId);
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

    const tournament = await updateTournament(id, ctx.sportId, parsed.data);
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
    const ctx = await requireWikiManagementAccess();
    const id = parseEntityIdParam((await params).id, "tournament id");

    const existing = await requireOwnedTournament(id, ctx.sportId, ctx.userId);
    assertTournamentDeletable(existing);

    const [paid] = await getDb()
      .select({ id: tournamentPayments.id })
      .from(tournamentPayments)
      .where(
        and(
          eq(tournamentPayments.tournamentId, id),
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

    if (await hasBracket(id)) {
      throw new AppError("Cannot delete tournament with an active bracket", {
        code: "CONFLICT",
        statusCode: 409,
      });
    }

    await deleteTournament(id, ctx.sportId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
