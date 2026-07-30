import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import {
  parseSearchParamsWithSchema,
  partnerLeaguesListQuerySchema,
} from "@/lib/partners/list-query";
import { queryPartnerLeagues } from "@/lib/partners/leagues";
import { getActivePartnerBySlug } from "@/lib/partners/service";

export const runtime = "nodejs";

/** Public league directory for a partner white-label site. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "general",
      skipOriginCheck: true,
      keySuffix: "partner-leagues",
    });

    const { partnerSlug: raw } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseSearchParamsWithSchema(searchParams, partnerLeaguesListQuerySchema);
    const status =
      parsed.status === "all" || parsed.status === "draft" || parsed.status === "archived"
        ? "public"
        : parsed.status;

    const result = await queryPartnerLeagues(partner.id, { ...parsed, status });

    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
