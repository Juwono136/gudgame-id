import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { searchPartnerPlayerEligibility } from "@/lib/partners/eligibility";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import {
  parseSearchParamsWithSchema,
  partnerEligibilityListQuerySchema,
} from "@/lib/partners/list-query";

export const runtime = "nodejs";

/**
 * Public Database Eligibility for a partner white-label site.
 * Searchable by anyone on the partner route — data stays partner-scoped
 * and never mixes into Gud Game career / player history.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "sensitive",
      skipOriginCheck: true,
      keySuffix: "partner-eligibility",
    });

    const { partnerSlug: raw } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = parseSearchParamsWithSchema(searchParams, partnerEligibilityListQuerySchema);
    const result = await searchPartnerPlayerEligibility(partner.id, query);
    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
