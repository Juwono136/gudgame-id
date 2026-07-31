import "server-only";

import { auth } from "@/lib/auth/server";
import { getBaseUrl } from "@/lib/auth/urls-server";
import { siteConfig } from "@/lib/config";
import { authRoutes, dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-role-notify" });

export type NotifyPartnerRoleAssignedInput = {
  email: string;
  userName: string;
  partnerSlug: string;
  partnerDisplayName: string;
  /** True when the account was just created via admin invite (invite email already sent). */
  isNewAccount: boolean;
  /** When false and not a new account, also trigger a verification email. */
  emailVerified: boolean;
};

/**
 * Notify a user that Partner access was granted.
 * Fire-and-forget — must not block admin create/edit success after provisioning.
 */
export function notifyPartnerRoleAssigned(input: NotifyPartnerRoleAssignedInput): void {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    log.warn("Partner role notify skipped — empty email");
    return;
  }

  const baseUrl = getBaseUrl();
  const needsEmailVerification = !input.isNewAccount && !input.emailVerified;

  sendTemplatedEmailInBackground(
    {
      to: email,
      template: "partner-role-assigned",
      data: {
        userName: input.userName.trim() || "there",
        partnerDisplayName: input.partnerDisplayName.trim() || "Partner",
        partnerSlug: input.partnerSlug,
        consoleUrl: `${baseUrl}${dashboardRoutes.partner}`,
        publicUrl: `${baseUrl}${partnerPublicRoutes.home(input.partnerSlug)}`,
        loginUrl: `${baseUrl}${authRoutes.login}`,
        appName: siteConfig.name,
        isNewAccount: input.isNewAccount,
        needsEmailVerification,
      },
    },
    { module: "partner-role-notify" },
  );

  if (!needsEmailVerification) return;

  void auth.api
    .sendVerificationEmail({
      body: {
        email,
        callbackURL: `${baseUrl}${authRoutes.verifyEmail}?status=success`,
      },
    })
    .then(() => {
      log.info("Verification email re-sent after partner role grant", { email });
    })
    .catch((error: unknown) => {
      log.error("Failed to re-send verification after partner role grant", {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}
