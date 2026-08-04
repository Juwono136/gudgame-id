import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { listPartnerLeagueOptions } from "@/lib/partners/leagues";
import { getActivePartnerBySlug } from "@/lib/partners/service";

export const runtime = "nodejs";

/** Public-linkable leagues for tournament directory filter chips. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "general",
      skipOriginCheck: true,
      keySuffix: "partner-public-league-options",
    });

    const { partnerSlug: raw } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const items = await listPartnerLeagueOptions(partner.id);
    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}
