import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { adminInvitePending } from "@/db/schema/admin-invite";

const TTL_MS = 15 * 60 * 1000;

export async function setAdminInvitePending(
  email: string,
  temporaryPassword: string,
): Promise<void> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db
    .insert(adminInvitePending)
    .values({
      email: normalized,
      temporaryPassword,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: adminInvitePending.email,
      set: { temporaryPassword, expiresAt },
    });
}

export async function consumeAdminInvitePending(
  email: string,
): Promise<string | null> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();

  const [row] = await db
    .select()
    .from(adminInvitePending)
    .where(eq(adminInvitePending.email, normalized))
    .limit(1);

  if (!row) return null;

  await db
    .delete(adminInvitePending)
    .where(eq(adminInvitePending.email, normalized));

  if (row.expiresAt < new Date()) return null;
  return row.temporaryPassword;
}
