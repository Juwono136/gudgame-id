import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import {
  parseSearchParamsWithSchema,
  partnerTournamentsListQuerySchema,
} from "@/lib/partners/list-query";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { queryPartnerTournaments } from "@/lib/partners/tournaments";

export const runtime = "nodejs";

/** Public tournament directory for a partner white-label site. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "general",
      skipOriginCheck: true,
      keySuffix: "partner-tournaments",
    });

    const { partnerSlug: raw } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseSearchParamsWithSchema(searchParams, partnerTournamentsListQuerySchema);
    const status = parsed.status === "draft" ? "all" : parsed.status;
    const result = await queryPartnerTournaments(
      partner.id,
      { ...parsed, status },
      { excludeDrafts: true },
    );

    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
