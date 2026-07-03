import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { wikiEntities } from "@/db/schema/wiki";

/** Archive published player profiles left behind when a user account is deleted (FK set null). */
export async function archiveOrphanPublishedPlayerProfiles(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const result = await db
    .update(wikiEntities)
    .set({ status: "archived", updatedAt: now })
    .where(
      and(
        eq(wikiEntities.entityType, "player"),
        eq(wikiEntities.status, "published"),
        isNull(wikiEntities.ownerUserId),
      ),
    )
    .returning({ id: wikiEntities.id });

  return result.length;
}

/** Unpublish all sport player profiles owned by a user before account deletion. */
export async function archivePublishedPlayerProfilesForUser(userId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .update(wikiEntities)
    .set({ status: "archived", updatedAt: now, updatedBy: userId })
    .where(
      and(eq(wikiEntities.ownerUserId, userId), eq(wikiEntities.entityType, "player")),
    );
}

export async function isEligiblePublicPlayerProfile(entityId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ ownerUserId: wikiEntities.ownerUserId, isActive: user.isActive })
    .from(wikiEntities)
    .leftJoin(user, eq(wikiEntities.ownerUserId, user.id))
    .where(eq(wikiEntities.id, entityId))
    .limit(1);

  if (!row?.ownerUserId) return false;
  return row.isActive === true;
}
