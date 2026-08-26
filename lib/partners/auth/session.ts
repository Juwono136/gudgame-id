import "server-only";

import { AppError } from "@/lib/errors";
import {
  readPartnerPlayerSessionToken,
  readPartnerPlayerSessionTokenFromRequest,
} from "@/lib/partners/auth/cookies";
import {
  resolvePartnerPlayerSession,
  type PartnerPlayerSessionView,
} from "@/lib/partners/auth/service";
import {
  getActivePartnerBySlug,
  type PartnerPublicView,
} from "@/lib/partners/service";

export async function requireActivePartner(
  partnerSlug: string,
): Promise<PartnerPublicView> {
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) {
    throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  return partner;
}

export async function getPartnerPlayerSessionForSlug(
  partnerSlug: string,
  request?: Request,
): Promise<{ partner: PartnerPublicView; session: PartnerPlayerSessionView } | null> {
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) return null;
  const token = request
    ? readPartnerPlayerSessionTokenFromRequest(request, partner.slug)
    : await readPartnerPlayerSessionToken(partner.slug);
  const session = await resolvePartnerPlayerSession({
    partnerId: partner.id,
    token,
  });
  if (!session) return null;
  return { partner, session };
}

export async function requirePartnerPlayerSession(
  partnerSlug: string,
  request?: Request,
): Promise<{ partner: PartnerPublicView; session: PartnerPlayerSessionView }> {
  const resolved = await getPartnerPlayerSessionForSlug(partnerSlug, request);
  if (!resolved) {
    throw new AppError("Sign in required", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }
  return resolved;
}
