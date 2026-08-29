import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { guardApiRequest } from "@/lib/api/guard-request";
import {
  partnerAuthError,
  requestMeta,
  resolvePartnerFromParams,
  safeCallback,
  sessionCookieResponse,
} from "@/lib/partners/auth/api-helpers";
import { loginPartnerPlayer } from "@/lib/partners/auth/service";
import { partnerPlayerLoginSchema } from "@/lib/validations/partner-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ partnerSlug: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    await guardApiRequest(request, { tier: "partnerPlayerAuth" });
    const partner = await resolvePartnerFromParams(context.params);
    const body = await request.json();
    const parsed = partnerPlayerLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const meta = requestMeta(request);
    const result = await loginPartnerPlayer({
      partner,
      email: parsed.data.email,
      password: parsed.data.password,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return sessionCookieResponse(
      partner.slug,
      {
        session: result.session,
        redirectTo: safeCallback(partner.slug, parsed.data.callbackUrl),
      },
      result.token,
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      error.context?.reason === "PARTNER_STAFF_USE_GUDGAME_LOGIN"
    ) {
      const hint = error.context.staffLoginHint as {
        staffLoginUrl?: string;
      } | undefined;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            reason: "PARTNER_STAFF_USE_GUDGAME_LOGIN",
            staffLoginUrl: hint?.staffLoginUrl ?? null,
          },
        },
        { status: error.statusCode },
      );
    }
    return partnerAuthError(error);
  }
}
