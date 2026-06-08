import "server-only";

import { sendTemplatedEmail } from "@/lib/email/send";
import { isSmtpReady } from "@/lib/email/config";
import { siteConfig } from "@/lib/config";
import { authRoutes } from "@/lib/constants/routes";
import { getBaseUrl } from "@/lib/auth/urls-server";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth/google-welcome-email" });

/** Welcome email for auto-provisioned Google accounts (mirrors self-registration tone). */
export async function sendGoogleWelcomeEmail(input: {
  email: string;
  userName: string;
}): Promise<void> {
  if (!isSmtpReady() && process.env.NODE_ENV !== "development") {
    log.warn("Google welcome email skipped — SMTP not configured", {
      email: input.email,
    });
    return;
  }

  const loginUrl = `${getBaseUrl()}${authRoutes.login}`;

  const result = await sendTemplatedEmail({
    to: input.email,
    template: "verify-email",
    data: {
      userName: input.userName || "Player",
      verifyUrl: loginUrl,
      appName: siteConfig.name,
    },
  });

  if (!result.ok) {
    log.error("Google welcome email failed", {
      email: input.email,
      error: result.error,
    });
  }
}
