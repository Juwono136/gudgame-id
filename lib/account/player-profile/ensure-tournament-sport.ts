import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wikiEntities } from "@/db/schema";
import { slugifyWikiName, ensureUniqueWikiSlug } from "@/lib/wiki/slug";
import { getUserPhotoForWiki } from "@/lib/account/player-profile/sync-primary-photo";
import { resolveWikiDisplayNameForUser } from "@/lib/account/player-profile/resolve-wiki-display-name";

/**
 * Ensures a published wiki player profile exists for a user in a tournament sport
 * so participant lists can link to public player pages.
 */
export async function ensurePlayerWikiProfileForSport(
  userId: string,
  sportId: string,
): Promise<string | null> {
  const db = getDb();
  const now = new Date();

  const [published] = await db
    .select({ id: wikiEntities.id, slug: wikiEntities.slug })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.ownerUserId, userId),
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "player"),
        eq(wikiEntities.status, "published"),
      ),
    )
    .limit(1);

  if (published?.slug) return published.slug;

  const [draft] = await db
    .select({ id: wikiEntities.id, slug: wikiEntities.slug })
    .from(wikiEntities)
    .where(
      and(
        eq(wikiEntities.ownerUserId, userId),
        eq(wikiEntities.sportId, sportId),
        eq(wikiEntities.entityType, "player"),
      ),
    )
    .limit(1);

  const displayName = await resolveWikiDisplayNameForUser(userId);
  if (!displayName) return null;

  const photo = await getUserPhotoForWiki(userId);

  if (draft) {
    await db
      .update(wikiEntities)
      .set({
        status: "published",
        publishedAt: now,
        displayName,
        primaryImageUrl: photo.url,
        primaryImageStorageKey: photo.storageKey,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(eq(wikiEntities.id, draft.id));
    return draft.slug;
  }

  const preferredBaseSlug =
    slugifyWikiName(displayName) || slugifyWikiName(userId.slice(0, 8)) || "player";
  const slug = await ensureUniqueWikiSlug(preferredBaseSlug, async (candidate) => {
    const [row] = await db
      .select({ id: wikiEntities.id })
      .from(wikiEntities)
      .where(and(eq(wikiEntities.sportId, sportId), eq(wikiEntities.slug, candidate)))
      .limit(1);
    return Boolean(row);
  });

  const [created] = await db
    .insert(wikiEntities)
    .values({
      sportId,
      entityType: "player",
      slug,
      displayName,
      status: "published",
      publishedAt: now,
      attributes: {},
      performance: {},
      specs: {},
      features: [],
      sourceType: "manual",
      primaryImageUrl: photo.url,
      primaryImageStorageKey: photo.storageKey,
      ownerUserId: userId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning({ slug: wikiEntities.slug });

  return created?.slug ?? null;
}

export async function ensurePlayerWikiProfilesForTournament(
  sportId: string,
  userIds: string[],
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    unique.map((userId) => ensurePlayerWikiProfileForSport(userId, sportId).catch(() => null)),
  );
}
