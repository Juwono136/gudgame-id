import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { resolveOwnedPartnerLeagueId } from "@/lib/partners/leagues";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";
import {
  assertTournamentDeletable,
  assertTournamentEditable,
} from "@/lib/tournaments/manage-policy";
import { hasBracket } from "@/lib/tournaments/brackets/service";
import { deleteTournament, updateTournament } from "@/lib/tournaments/service";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

function normalizePartnerTournamentBody(
  body: Record<string, unknown>,
  existingStatus?: string,
) {
  const officialBilling =
    body.officialBilling === "paid" || body.officialBilling === "free"
      ? body.officialBilling
      : "free";
  const registrationFeeIdr =
    officialBilling === "paid"
      ? Number(body.registrationFeeIdr) || undefined
      : 0;

  return {
    ...body,
    allowedTierLevels: undefined,
    tournamentType: "fun_match",
    officialBilling,
    registrationFeeIdr,
    partnerTenant: true,
    scoringType: body.scoringType ?? "points",
    pointsPerMatch: body.pointsPerMatch ?? 21,
    maxTeamsPerGroup: body.maxTeamsPerGroup ?? 4,
    teamsAdvancePerGroup: body.teamsAdvancePerGroup ?? 1,
    bestRunnerUpSlots: body.bestRunnerUpSlots ?? 0,
    courtCount: body.courtCount ?? 2,
    scoreEntryMode: body.scoreEntryMode ?? "live",
    matchFormat: body.matchFormat ?? "classic_sets",
    matchScoreMode: body.matchScoreMode ?? "games",
    gameDecider: body.gameDecider ?? "golden_point",
    status: body.status ?? existingStatus,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const { id } = await params;
    const tournamentId = parseEntityIdParam(id, "tournament id");

    const existing = await getTournamentById(tournamentId);
    if (!existing) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (existing.partnerId !== partner.id) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }
    assertTournamentEditable(existing);

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = tournamentUpsertSchema.safeParse(
      normalizePartnerTournamentBody(body, existing.status),
    );
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { partnerTenant: _partnerTenant, ...validated } = parsed.data;
    const partnerLeagueId = await resolveOwnedPartnerLeagueId(
      partner.id,
      validated.partnerLeagueId,
      { allowExistingLeagueId: existing.partnerLeagueId },
    );
    const tournament = await updateTournament(tournamentId, existing.sportId, {
      ...validated,
      partnerLeagueId,
      allowedTierLevels: undefined,
    });

    return jsonSuccess(tournament);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const { id } = await params;
    const tournamentId = parseEntityIdParam(id, "tournament id");

    const existing = await getTournamentById(tournamentId);
    if (!existing) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (existing.partnerId !== partner.id) {
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
