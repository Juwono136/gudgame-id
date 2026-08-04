import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  getPartnerLeagueById,
  updatePartnerLeagueBrandImage,
} from "@/lib/partners/leagues";
import { cleanupPartnerLeagueBrandMedia } from "@/lib/partners/media-lifecycle";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";
import { uploadPartnerLeagueBrandImage } from "@/lib/partners/upload-league-brand";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ leagueId: string }> };

async function requirePartnerLeague(leagueId: string) {
  const ctx = await requireApiPartnerDashboardAccess();
  const partner = await getPrimaryPartnerForUser(ctx.userId);
  if (!partner) {
    throw new AppError("No partner organization linked", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }
  const league = await getPartnerLeagueById(partner.id, leagueId);
  if (!league) {
    throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  return { partner, league };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { leagueId } = await context.params;
    const { partner, league } = await requirePartnerLeague(leagueId);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("file is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const previousStorageKey = league.brandImageStorageKey;
    const previousUrl = league.brandImageUrl;

    const result = await uploadPartnerLeagueBrandImage(file, partner.id, leagueId);
    if (!result.ok) {
      throw new AppError(result.error, { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const updated = await updatePartnerLeagueBrandImage({
      partnerId: partner.id,
      leagueId,
      brandImageUrl: result.url,
      brandImageStorageKey: result.storageKey,
    });

    await cleanupPartnerLeagueBrandMedia({
      partnerId: partner.id,
      leagueId,
      keepKey: result.storageKey,
      previousStorageKey,
      previousUrl,
    });

    return jsonSuccess({
      league: updated,
      url: result.url,
      storageKey: result.storageKey,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { leagueId } = await context.params;
    const { partner, league } = await requirePartnerLeague(leagueId);

    const previousStorageKey = league.brandImageStorageKey;
    const previousUrl = league.brandImageUrl;

    const updated = await updatePartnerLeagueBrandImage({
      partnerId: partner.id,
      leagueId,
      brandImageUrl: null,
      brandImageStorageKey: null,
    });

    await cleanupPartnerLeagueBrandMedia({
      partnerId: partner.id,
      leagueId,
      keepKey: null,
      previousStorageKey,
      previousUrl,
    });

    return jsonSuccess({ league: updated, deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
