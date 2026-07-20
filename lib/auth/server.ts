import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { sendTemplatedEmail } from "@/lib/email/send";
import { isSmtpReady } from "@/lib/email/config";
import { siteConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import {
  EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
  PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from "@/lib/auth/constants";
import { getBaseUrl, getPasswordResetRedirectUrl } from "@/lib/auth/urls-server";
import { firebaseGooglePlugin } from "@/lib/auth/plugins/firebase-google";
import { authRedisSecondaryStorage } from "@/lib/auth/redis-secondary-storage";
import { GOOGLE_PROVIDER_ID } from "@/lib/auth/account-providers";
import { authRoutes } from "@/lib/constants/routes";
import {
  DOCKER_BUILD_AUTH_SECRET,
  isBuildTimeEnvValidationSkipped,
} from "@/lib/config/build-time";

const authLog = logger.child({ module: "auth" });

function getAuthSecret(): string {
  if (isBuildTimeEnvValidationSkipped()) {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (secret && secret.length >= 32) return secret;
    return DOCKER_BUILD_AUTH_SECRET;
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters in production");
  }
  return "dev-only-gud-game-auth-secret-min-32-chars!!!";
}

const appBaseUrl = getBaseUrl();

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: getAuthSecret(),
  baseURL: appBaseUrl,
  trustedOrigins: [appBaseUrl],
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
    storage: "secondary-storage",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/forget-password": { window: 3600, max: 5 },
      "/request-password-reset": { window: 3600, max: 5 },
    },
  },
  secondaryStorage: authRedisSecondaryStorage,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
    },
  },
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (!isSmtpReady() && process.env.NODE_ENV !== "development") {
        authLog.error("Password reset email skipped — SMTP not configured", {
          email: user.email,
        });
        return;
      }

      void sendTemplatedEmail({
        to: user.email,
        template: "reset-password",
        data: {
          userName: user.name || "Player",
          resetUrl: url,
          appName: siteConfig.name,
        },
      }).then((result) => {
        if (!result.ok) {
          authLog.error("Password reset email failed", {
            email: user.email,
            error: result.error,
          });
        }
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
    redirectTo: `${getBaseUrl()}${authRoutes.verifyEmail}?status=success`,
    redirectOnFailure: `${getBaseUrl()}${authRoutes.verifyEmail}?error=`,
    sendVerificationEmail: async ({ user, url }) => {
      if (!isSmtpReady() && process.env.NODE_ENV !== "development") {
        authLog.error("Verification email skipped — SMTP not configured", {
          email: user.email,
        });
        return;
      }

      const { consumeAdminInvitePending } = await import(
        "@/lib/auth/admin-invite-pending"
      );
      const temporaryPassword = await consumeAdminInvitePending(user.email);

      const template = temporaryPassword ? "admin-user-invite" : "verify-email";
      const data = temporaryPassword
        ? {
            userName: user.name || "there",
            verifyUrl: url,
            temporaryPassword,
            loginUrl: `${getBaseUrl()}${authRoutes.login}`,
            appName: siteConfig.name,
          }
        : {
            userName: user.name || "Player",
            verifyUrl: url,
            appName: siteConfig.name,
          };

      void sendTemplatedEmail({
        to: user.email,
        template,
        data,
      }).then((result) => {
        if (!result.ok) {
          authLog.error("Verification email failed", {
            email: user.email,
            template,
            error: result.error,
          });
        }
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "player",
        input: false,
      },
      phone: { type: "string", required: false },
      phoneCountryCode: { type: "string", required: false },
      nickname: { type: "string", required: false },
      clubName: { type: "string", required: false },
      fullNameKtp: { type: "string", required: false },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      invitedByAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (createdSession) => {
          const { getUserAccountStatusById } = await import(
            "@/lib/auth/account-status"
          );
          const account = await getUserAccountStatusById(createdSession.userId);
          if (account && !account.isActive) {
            throw new Error("Account deactivated");
          }
        },
        after: async (createdSession) => {
          const { touchUserLastLogin } = await import("@/lib/auth/last-login");
          await touchUserLastLogin(createdSession.userId);
        },
      },
      update: {
        after: async (updatedSession) => {
          const { touchUserLastLogin } = await import("@/lib/auth/last-login");
          await touchUserLastLogin(updatedSession.userId);
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [GOOGLE_PROVIDER_ID],
    },
  },
  plugins: [nextCookies(), firebaseGooglePlugin()],
});

export type Session = typeof auth.$Infer.Session;
