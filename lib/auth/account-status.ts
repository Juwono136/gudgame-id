import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { session, user } from "@/db/schema/auth";

export type UserAccountStatus = {
  isActive: boolean;
  mustChangePassword: boolean;
};

export async function getUserAccountStatusById(
  userId: string,
): Promise<UserAccountStatus | null> {
  const [row] = await getDb()
    .select({
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) return null;
  return {
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function getUserAccountStatusByEmail(
  email: string,
): Promise<(UserAccountStatus & { userId: string }) | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await getDb()
    .select({
      userId: user.id,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  if (!row) return null;
  return {
    userId: row.userId,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
  };
}

/** Ends all Better Auth sessions for a user (e.g. after deactivation). */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await getDb().delete(session).where(eq(session.userId, userId));
}
