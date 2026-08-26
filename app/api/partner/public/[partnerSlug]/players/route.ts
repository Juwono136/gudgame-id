import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import {
  parseSearchParamsWithSchema,
  partnerPlayersListQuerySchema,
} from "@/lib/partners/list-query";
import { isUserPartnerMember } from "@/lib/partners/membership";
import { queryPartnerPlayersWithReconcile } from "@/lib/partners/player-stats";
import { getActivePartnerBySlug } from "@/lib/partners/service";

export const runtime = "nodejs";

/** Staff-only partner player directory with win/loss stats. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "sensitive",
      keySuffix: "partner-players",
    });

    const { userId } = await requireApiRoleGuardContext();
    const { partnerSlug: raw } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const allowed = await isUserPartnerMember(userId, partner.id);
    if (!allowed) {
      throw new AppError("Only partner staff can view the players list for this site.", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const query = parseSearchParamsWithSchema(searchParams, partnerPlayersListQuerySchema);
    const result = await queryPartnerPlayersWithReconcile(partner.id, query);
    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
