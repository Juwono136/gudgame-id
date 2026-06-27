import { eq } from "drizzle-orm";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { auth } from "@/lib/auth/server";
import { sanitizeRegistrationErrorMessage } from "@/lib/auth/sanitize-registration-error";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { registerSchema } from "@/lib/validations/auth";
import { authRoutes } from "@/lib/constants/routes";
import { getDialByCountryCode } from "@/lib/constants/phone-countries";
import { guardApiRequest } from "@/lib/api/guard-request";

const log = logger.child({ route: "/api/account/register" });

export const runtime = "nodejs";

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Player";
  return local.replace(/[._-]+/g, " ").trim() || "Player";
}

export async function POST(request: Request) {
  try {
    await guardApiRequest(request, { tier: "register" });

    const formData = await request.formData();

    const parsed = registerSchema.safeParse({
      email: formData.get("email"),
      phoneCountryCode: formData.get("phoneCountryCode") || "",
      phone: formData.get("phone") || "",
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      throw new AppError("Please check your details and try again.", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const displayName = displayNameFromEmail(email);

    const baseUrl =
      process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const callbackUrlRaw = formData.get("callbackUrl");
    const callbackUrl =
      typeof callbackUrlRaw === "string" && callbackUrlRaw.trim()
        ? callbackUrlRaw.trim()
        : null;

    const verifyCallback = callbackUrl
      ? `${baseUrl}${authRoutes.verifyEmail}?status=success&callbackUrl=${encodeURIComponent(callbackUrl)}`
      : `${baseUrl}${authRoutes.verifyEmail}?status=success`;

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: displayName,
        email,
        password: data.password,
        callbackURL: verifyCallback,
      },
    });

    if (!signUpResult?.user) {
      throw new AppError("Registration could not be completed. Please try again.", {
        code: "REGISTRATION_FAILED",
        statusCode: 400,
      });
    }

    const phoneDialCode = data.phoneCountryCode
      ? (getDialByCountryCode(data.phoneCountryCode) ?? data.phoneCountryCode)
      : null;

    await getDb()
      .update(user)
      .set({
        phone: data.phone?.trim() || null,
        phoneCountryCode: phoneDialCode,
        updatedAt: new Date(),
      })
      .where(eq(user.id, signUpResult.user.id));

    const { ensureDefaultPlayerRole } = await import("@/lib/roles/sync");
    await ensureDefaultPlayerRole(signUpResult.user.id);

    return jsonSuccess({
      message:
        "Account created. Check your email to verify your address before signing in.",
      redirectTo: callbackUrl
        ? `${authRoutes.checkEmail}?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : authRoutes.checkEmail,
    });
  } catch (err) {
    log.error("Registration failed", err);

    if (err instanceof AppError) {
      return jsonError(err);
    }

    const friendly = sanitizeRegistrationErrorMessage(err);
    const statusCode = friendly.toLowerCase().includes("already") ? 409 : 500;

    return jsonError(
      new AppError(friendly, {
        code: statusCode === 409 ? "CONFLICT" : "REGISTRATION_FAILED",
        statusCode,
      }),
    );
  }
}
