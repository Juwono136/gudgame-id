import "server-only";
import { eq, inArray, max } from "drizzle-orm";
import { getDb } from "@/db/client";
import { session, user } from "@/db/schema/auth";

export async function touchUserLastLogin(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(user)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function getLastLoginMap(
  userIds: string[],
): Promise<Record<string, Date | null>> {
  if (userIds.length === 0) return {};

  const db = getDb();
  const map: Record<string, Date | null> = {};

  const users = await db
    .select({ id: user.id, lastLoginAt: user.lastLoginAt })
    .from(user)
    .where(inArray(user.id, userIds));

  for (const u of users) {
    map[u.id] = u.lastLoginAt ?? null;
  }

  const missing = userIds.filter((id) => !map[id]);
  if (missing.length === 0) return map;

  const sessionRows = await db
    .select({
      userId: session.userId,
      at: max(session.updatedAt),
    })
    .from(session)
    .where(inArray(session.userId, missing))
    .groupBy(session.userId);

  for (const row of sessionRows) {
    if (!map[row.userId] && row.at) {
      map[row.userId] = row.at;
    }
  }

  for (const id of userIds) {
    if (!(id in map)) map[id] = null;
  }

  return map;
}
