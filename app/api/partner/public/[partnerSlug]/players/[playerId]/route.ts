import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { isUserPartnerMember } from "@/lib/partners/membership";
import { archivePartnerPlayer } from "@/lib/partners/players/archive";
import { requirePartnerPlayer } from "@/lib/partners/player-stats";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getTrustedClientIp } from "@/lib/security/client-ip";

export const runtime = "nodejs";

async function requirePartnerStaffContext(rawPartnerSlug: string, playerId: string) {
  const { userId } = await requireApiRoleGuardContext();
  const slug = normalizePartnerSlug(rawPartnerSlug);
  const partner = await getActivePartnerBySlug(slug);
  if (!partner) {
    throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const allowed = await isUserPartnerMember(userId, partner.id);
  if (!allowed) {
    throw new AppError("Only partner staff can manage players for this site.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (!playerId?.trim()) {
    throw new AppError("Player id is required", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  return { partner, playerId: playerId.trim(), userId };
}

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

    const { partnerSlug: raw, playerId: rawPlayerId } = await params;
    const { partner, playerId } = await requirePartnerStaffContext(raw, rawPlayerId);
    const player = await requirePartnerPlayer(partner.id, playerId);
    return jsonSuccess({
      partner: { slug: partner.slug, displayName: partner.displayName },
      player,
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** Soft-remove player from the partner directory (keeps match history for audit). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; playerId: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "sensitive",
      keySuffix: "partner-player-delete",
    });

    const { partnerSlug: raw, playerId: rawPlayerId } = await params;
    const { partner, playerId, userId } = await requirePartnerStaffContext(raw, rawPlayerId);

    const ip = getTrustedClientIp(request);
    await enforceRateLimit({
      key: `partner-player-delete:${partner.id}:${userId}:${ip}`,
      limit: 20,
      windowSeconds: 60,
      failClosedInProduction: true,
    });

    await archivePartnerPlayer({ partnerId: partner.id, playerId });
    return jsonSuccess({ archived: true, playerId });
  } catch (error) {
    return jsonError(error);
  }
}
