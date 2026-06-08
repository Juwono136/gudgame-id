import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";

export const GOOGLE_PROVIDER_ID = "google";
export const CREDENTIAL_PROVIDER_ID = "credential";

export type UserAuthProviders = {
  userId: string;
  hasGoogle: boolean;
  hasPassword: boolean;
  isGoogleOnly: boolean;
};

export async function getUserAuthProvidersByEmail(
  email: string,
): Promise<UserAuthProviders | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  if (!row) return null;
  return getUserAuthProvidersByUserId(row.id);
}

export async function getUserAuthProvidersByUserId(
  userId: string,
): Promise<UserAuthProviders> {
  const rows = await getDb()
    .select({
      providerId: account.providerId,
      password: account.password,
    })
    .from(account)
    .where(eq(account.userId, userId));

  const hasGoogle = rows.some((r) => r.providerId === GOOGLE_PROVIDER_ID);
  const hasPassword = rows.some(
    (r) =>
      (r.providerId === CREDENTIAL_PROVIDER_ID || r.providerId === "email") &&
      Boolean(r.password),
  );

  return {
    userId,
    hasGoogle,
    hasPassword,
    isGoogleOnly: hasGoogle && !hasPassword,
  };
}
