/**
 * Minimal Better Auth instance for CLI bootstrap scripts (no `server-only`).
 * Not for request handlers — use `@/lib/auth/server` in the app.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

function getBootstrapAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET (min 32 chars) is required for bootstrap admin",
    );
  }
  return secret;
}

function getBootstrapBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getBootstrapAuth() {
  const baseURL = getBootstrapBaseUrl();

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: getBootstrapAuthSecret(),
    baseURL,
    trustedOrigins: [baseURL],
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      autoSignIn: false,
    },
    emailVerification: {
      sendOnSignUp: false,
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
  });
}
