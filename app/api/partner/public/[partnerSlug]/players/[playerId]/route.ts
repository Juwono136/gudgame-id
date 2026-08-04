import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { isUserPartnerMember } from "@/lib/partners/membership";
import { requirePartnerPlayer } from "@/lib/partners/player-stats";
import { getActivePartnerBySlug } from "@/lib/partners/service";

export const runtime = "nodejs";

/** Staff-only partner player detail + match history (auto-refresh friendly). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; playerId: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "sensitive",
      keySuffix: "partner-player-detail",
    });

    const { userId } = await requireApiRoleGuardContext();
    const { partnerSlug: raw, playerId } = await params;
    const slug = normalizePartnerSlug(raw);
    const partner = await getActivePartnerBySlug(slug);
    if (!partner) {
      throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const allowed = await isUserPartnerMember(userId, partner.id);
    if (!allowed) {
      throw new AppError("Only partner staff can view player profiles for this site.", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    if (!playerId?.trim()) {
      throw new AppError("Player id is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const player = await requirePartnerPlayer(partner.id, playerId.trim());
    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      player,
    });
  } catch (error) {
    return jsonError(error);
  }
}
