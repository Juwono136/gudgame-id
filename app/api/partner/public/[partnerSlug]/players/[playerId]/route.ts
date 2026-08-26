import { guardApiRequest } from "@/lib/api/guard-request";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { isUserPartnerMember } from "@/lib/partners/membership";
import { archivePartnerPlayer } from "@/lib/partners/players/archive";
import { updatePartnerPlayer } from "@/lib/partners/players/update";
import { requirePartnerPlayer } from "@/lib/partners/player-stats";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getTrustedClientIp } from "@/lib/security/client-ip";
import { z } from "zod";

export const runtime = "nodejs";

const updatePlayerBodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/),
});

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

/** Update player contact / name (staff-only). Syncs linked member identity when present. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ partnerSlug: string; playerId: string }> },
) {
  try {
    await guardApiRequest(request, {
      tier: "sensitive",
      keySuffix: "partner-player-patch",
    });

    const { partnerSlug: raw, playerId: rawPlayerId } = await params;
    const { partner, playerId, userId } = await requirePartnerStaffContext(raw, rawPlayerId);

    const ip = getTrustedClientIp(request);
    await enforceRateLimit({
      key: `partner-player-patch:${partner.id}:${userId}:${ip}`,
      limit: 40,
      windowSeconds: 60,
      failClosedInProduction: true,
    });

    const body = await request.json();
    const parsed = updatePlayerBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await updatePartnerPlayer({
      partnerId: partner.id,
      playerId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
    });

    const player = await requirePartnerPlayer(partner.id, playerId);
    return jsonSuccess({ player });
  } catch (error) {
    return jsonError(error);
  }
}
