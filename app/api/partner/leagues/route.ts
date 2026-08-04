import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { resolveDashboardSportContext } from "@/lib/dashboard/sport-context";
import { AppError } from "@/lib/errors";
import {
  parseSearchParamsWithSchema,
  partnerLeaguesListQuerySchema,
} from "@/lib/partners/list-query";
import { createPartnerLeague, queryPartnerLeagues } from "@/lib/partners/leagues";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";

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
    const query = parseSearchParamsWithSchema(searchParams, partnerLeaguesListQuerySchema);
    const result = await queryPartnerLeagues(partner.id, query);
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

    const body = (await request.json()) as {
      name?: string;
      summary?: string | null;
      description?: string | null;
    };
    const name = typeof body.name === "string" ? body.name : "";
    if (name.trim().length < 2) {
      return Response.json(
        { error: "Validation failed", fieldErrors: { name: ["Enter a league name"] } },
        { status: 422 },
      );
    }

    const sportCtx = await resolveDashboardSportContext(ctx.userId);
    const created = await createPartnerLeague({
      partnerId: partner.id,
      sportId: sportCtx.sportId,
      name,
      summary: typeof body.summary === "string" ? body.summary : null,
      description: typeof body.description === "string" ? body.description : null,
      createdBy: ctx.userId,
    });

    return jsonSuccess(created, 201);
  } catch (error) {
    return jsonError(error);
  }
}
