import { AppError } from "@/lib/errors";
import { guardApiRequest } from "@/lib/api/guard-request";
import {
  partnerAuthError,
  resolvePartnerFromParams,
} from "@/lib/partners/auth/api-helpers";
import { jsonSuccess } from "@/lib/api/response";
import { signupPartnerPlayer } from "@/lib/partners/auth/service";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { partnerPlayerSignupSchema } from "@/lib/validations/partner-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "partnerPlayerRegister" });
    const partner = await resolvePartnerFromParams(context.params);
    const body = await request.json();
    const parsed = partnerPlayerSignupSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await signupPartnerPlayer({
      partner,
      email: parsed.data.email,
      password: parsed.data.password,
      displayName: parsed.data.displayName,
      phone: parsed.data.phone,
    });

    const routes = partnerAuthRoutes(partner.slug);
    return jsonSuccess({
      ok: true,
      email: parsed.data.email,
      redirectTo: `${routes.checkEmail}?email=${encodeURIComponent(parsed.data.email)}`,
    });
  } catch (error) {
    return partnerAuthError(error);
  }
}
