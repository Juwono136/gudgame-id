import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  parseSearchParamsWithSchema,
  partnerTournamentsListQuerySchema,
} from "@/lib/partners/list-query";
import { resolveOwnedPartnerLeagueId } from "@/lib/partners/leagues";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";
import { queryPartnerTournaments } from "@/lib/partners/tournaments";
import { createTournament } from "@/lib/tournaments/service";
import { resolveDashboardSportContext } from "@/lib/dashboard/sport-context";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const { searchParams } = new URL(request.url);
    const query = parseSearchParamsWithSchema(searchParams, partnerTournamentsListQuerySchema);
    const result = await queryPartnerTournaments(partner.id, query);
    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date();
    const ends = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const officialBilling =
      body.officialBilling === "paid" || body.officialBilling === "free"
        ? body.officialBilling
        : "free";
    const registrationFeeIdr =
      officialBilling === "paid"
        ? Number(body.registrationFeeIdr) || undefined
        : 0;

    const parsed = tournamentUpsertSchema.safeParse({
      ...body,
      allowedTierLevels: undefined,
      tournamentType: "fun_match",
      officialBilling,
      registrationFeeIdr,
      partnerTenant: true,
      startsAt: body.startsAt || now.toISOString(),
      endsAt: body.endsAt || ends.toISOString(),
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
    });
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const sportCtx = await resolveDashboardSportContext(ctx.userId);
    const { partnerTenant: _partnerTenant, ...validated } = parsed.data;
    const partnerLeagueId = await resolveOwnedPartnerLeagueId(
      partner.id,
      validated.partnerLeagueId,
    );
    const input = {
      ...validated,
      partnerLeagueId,
      allowedTierLevels: undefined,
    };

    const created = await createTournament(sportCtx.sportId, ctx.userId, input, {
      partnerId: partner.id,
    });

    return jsonSuccess(created, 201);
  } catch (error) {
    return jsonError(error);
  }
}
