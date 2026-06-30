import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { wikiEntities } from "@/db/schema";
import { getMediaProxyPath } from "@/lib/storage/media-url";

export async function getUserPhotoForWiki(userId: string): Promise<{
  url: string | null;
  storageKey: string | null;
}> {
  const [dbUser] = await getDb()
    .select({ image: user.image, imageStorageKey: user.imageStorageKey })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) return { url: null, storageKey: null };

  const url =
    dbUser.image?.trim() ||
    (dbUser.imageStorageKey ? getMediaProxyPath(dbUser.imageStorageKey) : null);

  return {
    url: url ?? null,
    storageKey: dbUser.imageStorageKey ?? null,
  };
}

/** Copies the account profile photo onto all owned wiki player entities. */
export async function syncPlayerPrimaryPhotoFromUser(userId: string): Promise<void> {
  const photo = await getUserPhotoForWiki(userId);
  if (!photo.url && !photo.storageKey) return;

  await getDb()
    .update(wikiEntities)
    .set({
      primaryImageUrl: photo.url,
      primaryImageStorageKey: photo.storageKey,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(wikiEntities.ownerUserId, userId),
        eq(wikiEntities.entityType, "player"),
      ),
    );
}
