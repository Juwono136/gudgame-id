import "server-only";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";
import {
  CREDENTIAL_PROVIDER_ID,
  getUserAuthProvidersByUserId,
} from "@/lib/auth/account-providers";
import { AppError } from "@/lib/errors";
import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import { siteConfig } from "@/lib/config";
import type { ChangePasswordSettingsInput } from "@/lib/validations/account-settings";

function sendPasswordChangedEmail(email: string, displayName: string) {
  sendTemplatedEmailInBackground(
    {
      to: email,
      template: "password-changed",
      data: {
        userName: displayName || email,
        appName: siteConfig.name,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/login`,
        changedAt: new Date().toISOString(),
      },
    },
    { module: "set-password" },
  );
}

/** Google-only (or password-less) accounts: add email/password sign-in. */
export async function setInitialAccountPassword(
  userId: string,
  input: Pick<ChangePasswordSettingsInput, "password" | "confirmPassword">,
) {
  const providers = await getUserAuthProvidersByUserId(userId);
  if (providers.hasPassword) {
    throw new AppError("Password is already set. Use change password instead.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const [dbUser] = await getDb()
    .select({ email: user.email, name: user.name, fullNameKtp: user.fullNameKtp })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const hashed = await hashPassword(input.password);
  const now = new Date();

  const [existingCred] = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)),
    )
    .limit(1);

  if (existingCred) {
    await getDb()
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.id, existingCred.id));
  } else {
    await getDb().insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
  }

  sendPasswordChangedEmail(
    dbUser.email,
    dbUser.fullNameKtp ?? dbUser.name ?? dbUser.email,
  );

  return { success: true as const };
}
