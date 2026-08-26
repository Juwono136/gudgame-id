import { AppError } from "@/lib/errors";
import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonSuccess } from "@/lib/api/response";
import {
  partnerAuthError,
  resolvePartnerFromParams,
} from "@/lib/partners/auth/api-helpers";
import { resendPartnerPlayerVerification } from "@/lib/partners/auth/service";
import { partnerPlayerResendVerifySchema } from "@/lib/validations/partner-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "passwordReset" });
    const partner = await resolvePartnerFromParams(context.params);
    const body = await request.json();
    const parsed = partnerPlayerResendVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await resendPartnerPlayerVerification({
      partner,
      email: parsed.data.email,
    });

    return jsonSuccess({ ok: true });
  } catch (error) {
    return partnerAuthError(error);
  }
}
