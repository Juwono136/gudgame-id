import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getUserAuthProvidersByUserId } from "@/lib/auth/account-providers";
import { AppError } from "@/lib/errors";
import { sendTemplatedEmail } from "@/lib/email/send";
import { siteConfig } from "@/lib/config";
import type { ChangePasswordSettingsInput } from "@/lib/validations/account-settings";

export async function changeAccountPassword(
  userId: string,
  email: string,
  displayName: string,
  input: ChangePasswordSettingsInput,
) {
  const providers = await getUserAuthProvidersByUserId(userId);

  if (!providers.hasPassword) {
    throw new AppError(
      "Password sign-in is not enabled for this account. Use Google sign-in or contact support.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.password,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });
  } catch {
    throw new AppError("Could not update password. Check your current password.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
      context: { fieldErrors: { currentPassword: ["Current password is incorrect"] } },
    });
  }

  const emailResult = await sendTemplatedEmail({
    to: email,
    template: "password-changed",
    data: {
      userName: displayName || email,
      appName: siteConfig.name,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/login`,
      changedAt: new Date().toISOString(),
    },
  });

  if (!emailResult.ok) {
    // Password already changed — log but don't fail the request
    const { logger } = await import("@/lib/logger");
    logger.child({ module: "change-password" }).warn("Password changed email failed", {
      error: emailResult.error,
    });
  }

  return { success: true as const };
}
