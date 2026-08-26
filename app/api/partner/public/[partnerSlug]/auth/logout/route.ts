import { guardApiRequest } from "@/lib/api/guard-request";
import {
  partnerAuthError,
  resolvePartnerFromParams,
  sessionCookieResponse,
} from "@/lib/partners/auth/api-helpers";
import { readPartnerPlayerSessionTokenFromRequest } from "@/lib/partners/auth/cookies";
import { logoutPartnerPlayerSession } from "@/lib/partners/auth/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "partnerPlayerAuth" });
    const partner = await resolvePartnerFromParams(context.params);
    const token = readPartnerPlayerSessionTokenFromRequest(request, partner.slug);
    await logoutPartnerPlayerSession({ partnerId: partner.id, token });
    return sessionCookieResponse(partner.slug, { ok: true }, null);
  } catch (error) {
    return partnerAuthError(error);
  }
}
