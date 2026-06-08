import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { getPasswordResetRedirectUrl } from "@/lib/auth/urls-server";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { logger } from "@/lib/logger";
import { forgotPasswordSchema } from "@/lib/validations/auth";

const log = logger.child({ route: "/api/account/forgot-password" });

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Enter a valid email address",
          code: "VALIDATION_ERROR",
        },
        { status: 422 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const existing = await getDb()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json(
        {
          error:
            "No TandingBase account is registered with this email. Check the spelling or create an account.",
          code: "ACCOUNT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: getPasswordResetRedirectUrl(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Password reset email sent. Check your inbox.",
    });
  } catch (err) {
    log.error("Forgot password request failed", err);
    return NextResponse.json(
      {
        error: "Could not send reset email. Please try again in a few minutes.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
