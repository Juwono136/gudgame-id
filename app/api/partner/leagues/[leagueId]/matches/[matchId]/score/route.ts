import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { recordPartnerLeagueMatchScore } from "@/lib/partners/leagues";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ leagueId: string; matchId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const { leagueId, matchId } = await context.params;
    const body = (await request.json()) as {
      scoreA?: unknown;
      scoreB?: unknown;
      notes?: string | null;
    };

    const scoreA = typeof body.scoreA === "number" ? body.scoreA : Number(body.scoreA);
    const scoreB = typeof body.scoreB === "number" ? body.scoreB : Number(body.scoreB);

    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      return Response.json(
        {
          error: "Validation failed",
          fieldErrors: { score: ["Enter both scores"] },
        },
        { status: 422 },
      );
    }

    const match = await recordPartnerLeagueMatchScore({
      partnerId: partner.id,
      leagueId,
      matchId,
      scoreA: Math.trunc(scoreA),
      scoreB: Math.trunc(scoreB),
      recordedBy: ctx.userId,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return jsonSuccess(match);
  } catch (error) {
    return jsonError(error);
  }
}
