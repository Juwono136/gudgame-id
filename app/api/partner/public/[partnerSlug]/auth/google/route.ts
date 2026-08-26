import { AppError } from "@/lib/errors";
import { guardApiRequest } from "@/lib/api/guard-request";
import {
  partnerAuthError,
  requestMeta,
  resolvePartnerFromParams,
  safeCallback,
  sessionCookieResponse,
} from "@/lib/partners/auth/api-helpers";
import { loginOrSignupPartnerPlayerWithGoogle } from "@/lib/partners/auth/google";
import { partnerPlayerGoogleAuthSchema } from "@/lib/validations/partner-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

/**
 * POST /api/partner/public/{partnerSlug}/auth/google
 * Body: { idToken, callbackUrl? }
 * Verifies Firebase Google ID token and creates/links a partner-scoped session.
 * Does not touch Gud Game Better Auth cookies or sessions.
 */
export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "partnerPlayerAuth" });
    const partner = await resolvePartnerFromParams(context.params);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("Invalid request body", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const parsed = partnerPlayerGoogleAuthSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const meta = requestMeta(request);
    const result = await loginOrSignupPartnerPlayerWithGoogle({
      partner,
      idToken: parsed.data.idToken,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return sessionCookieResponse(
      partner.slug,
      {
        session: result.session,
        isNewUser: result.isNewUser,
        redirectTo: safeCallback(partner.slug, parsed.data.callbackUrl),
      },
      result.token,
    );
  } catch (error) {
    return partnerAuthError(error);
  }
}
