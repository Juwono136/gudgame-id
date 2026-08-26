import { AppError } from "@/lib/errors";
import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonSuccess } from "@/lib/api/response";
import {
  partnerAuthError,
  resolvePartnerFromParams,
} from "@/lib/partners/auth/api-helpers";
import { requestPartnerPlayerPasswordReset } from "@/lib/partners/auth/service";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { partnerPlayerForgotPasswordSchema } from "@/lib/validations/partner-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "passwordReset" });
    const partner = await resolvePartnerFromParams(context.params);
    const body = await request.json();
    const parsed = partnerPlayerForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await requestPartnerPlayerPasswordReset({
      partner,
      email: parsed.data.email,
    });

    const routes = partnerAuthRoutes(partner.slug);
    return jsonSuccess({
      ok: true,
      redirectTo: `${routes.forgotPasswordSent}?email=${encodeURIComponent(parsed.data.email)}`,
    });
  } catch (error) {
    return partnerAuthError(error);
  }
}
