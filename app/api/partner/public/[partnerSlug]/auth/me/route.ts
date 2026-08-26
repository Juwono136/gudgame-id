import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonSuccess } from "@/lib/api/response";
import {
  partnerAuthError,
  resolvePartnerFromParams,
} from "@/lib/partners/auth/api-helpers";
import { readPartnerPlayerSessionTokenFromRequest } from "@/lib/partners/auth/cookies";
import { resolvePartnerPlayerSession } from "@/lib/partners/auth/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "general", skipOriginCheck: true });
    const partner = await resolvePartnerFromParams(context.params);
    const token = readPartnerPlayerSessionTokenFromRequest(request, partner.slug);
    const session = await resolvePartnerPlayerSession({
      partnerId: partner.id,
      token,
    });
    return jsonSuccess({
      authenticated: Boolean(session),
      session,
      partner: {
        slug: partner.slug,
        displayName: partner.displayName,
      },
    });
  } catch (error) {
    return partnerAuthError(error);
  }
}
