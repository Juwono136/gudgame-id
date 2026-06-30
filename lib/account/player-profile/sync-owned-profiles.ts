import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, user, wikiEntities } from "@/db/schema";
import { filterSportCatalogSlugs } from "@/lib/sports/catalog";
import { slugifyWikiName, ensureUniqueWikiSlug } from "@/lib/wiki/slug";
import { getUserPhotoForWiki } from "@/lib/account/player-profile/sync-primary-photo";
import { requirePlayerDisplayNameForUser } from "@/lib/account/player-profile/resolve-display-name";

export type OwnedPlayerEntityRow = {
  id: string;
  sportId: string;
  sportSlug: string;
  status: string;
};

export async function listOwnedPlayerEntities(userId: string): Promise<OwnedPlayerEntityRow[]> {
  return getDb()
    .select({
      id: wikiEntities.id,
      sportId: wikiEntities.sportId,
      sportSlug: sports.slug,
      status: wikiEntities.status,
    })
    .from(wikiEntities)
    .innerJoin(sports, eq(wikiEntities.sportId, sports.id))
    .where(
      and(eq(wikiEntities.ownerUserId, userId), eq(wikiEntities.entityType, "player")),
    );
}

/**
 * Ensures each followed sport that is provisioned on the platform has a published
 * wiki player profile owned by the user. Profiles for removed interests are archived.
 */
export async function syncOwnedPlayerProfilesFromSportInterests(
  userId: string,
): Promise<{ syncedSportSlugs: string[] }> {
  const db = getDb();

  const [dbUser] = await db
    .select({ sportInterestSlugs: user.sportInterestSlugs })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const interestSlugs = filterSportCatalogSlugs(dbUser?.sportInterestSlugs ?? []);
  const existing = await listOwnedPlayerEntities(userId);

  if (interestSlugs.length === 0) {
    if (existing.length > 0) {
      await db
        .update(wikiEntities)
        .set({ status: "archived", updatedAt: new Date(), updatedBy: userId })
        .where(
          and(
            eq(wikiEntities.ownerUserId, userId),
            eq(wikiEntities.entityType, "player"),
          ),
        );
    }
    return { syncedSportSlugs: [] };
  }

  const provisioned = await db
    .select({ id: sports.id, slug: sports.slug, name: sports.name })
    .from(sports)
    .where(inArray(sports.slug, interestSlugs));

  const targetSlugSet = new Set(provisioned.map((s) => s.slug));
  const now = new Date();

  for (const row of existing) {
    if (!targetSlugSet.has(row.sportSlug)) {
      await db
        .update(wikiEntities)
        .set({ status: "archived", updatedAt: now, updatedBy: userId })
        .where(eq(wikiEntities.id, row.id));
    }
  }

  let displayName: string;
  try {
    displayName = await requirePlayerDisplayNameForUser(userId);
  } catch {
    return { syncedSportSlugs: [] };
  }

  const photo = await getUserPhotoForWiki(userId);
  const syncedSportSlugs: string[] = [];

  const primaryId = await getPrimaryOwnedPlayerEntityId(userId);
  const primaryDetail = primaryId
    ? await db
        .select({
          slug: wikiEntities.slug,
          summary: wikiEntities.summary,
          biography: wikiEntities.biography,
          attributes: wikiEntities.attributes,
          primaryImageUrl: wikiEntities.primaryImageUrl,
          primaryImageStorageKey: wikiEntities.primaryImageStorageKey,
        })
        .from(wikiEntities)
        .where(eq(wikiEntities.id, primaryId))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;

  const preferredBaseSlug =
    primaryDetail?.slug?.trim() || slugifyWikiName(displayName) || "player";

  for (const sport of provisioned) {
    const found = existing.find((row) => row.sportSlug === sport.slug);
    if (found) {
      if (found.status !== "published") {
        await db
          .update(wikiEntities)
          .set({
            status: "published",
            publishedAt: now,
            displayName,
            primaryImageUrl: photo.url,
            primaryImageStorageKey: photo.storageKey,
            updatedBy: userId,
            updatedAt: now,
          })
          .where(eq(wikiEntities.id, found.id));
      }
      syncedSportSlugs.push(sport.slug);
      continue;
    }

    const slug = await ensureUniqueWikiSlug(preferredBaseSlug, async (candidate) => {
      const [row] = await db
        .select({ id: wikiEntities.id })
        .from(wikiEntities)
        .where(and(eq(wikiEntities.sportId, sport.id), eq(wikiEntities.slug, candidate)))
        .limit(1);
      return Boolean(row);
    });

    try {
      await db.insert(wikiEntities).values({
        sportId: sport.id,
        entityType: "player",
        slug,
        displayName,
        summary: primaryDetail?.summary ?? null,
        biography: primaryDetail?.biography ?? null,
        status: "published",
        attributes: (primaryDetail?.attributes ?? {}) as Record<string, unknown>,
        performance: {},
        specs: {},
        features: [],
        sourceType: "manual",
        publishedAt: now,
        primaryImageUrl: photo.url ?? primaryDetail?.primaryImageUrl ?? null,
        primaryImageStorageKey: photo.storageKey ?? primaryDetail?.primaryImageStorageKey ?? null,
        ownerUserId: userId,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch {
      const fallbackSlug = await ensureUniqueWikiSlug(
        `${preferredBaseSlug}-${userId.slice(0, 8)}`,
        async (candidate) => {
          const [row] = await db
            .select({ id: wikiEntities.id })
            .from(wikiEntities)
            .where(and(eq(wikiEntities.sportId, sport.id), eq(wikiEntities.slug, candidate)))
            .limit(1);
          return Boolean(row);
        },
      );

      await db.insert(wikiEntities).values({
        sportId: sport.id,
        entityType: "player",
        slug: fallbackSlug,
        displayName,
        summary: primaryDetail?.summary ?? null,
        biography: primaryDetail?.biography ?? null,
        status: "published",
        attributes: (primaryDetail?.attributes ?? {}) as Record<string, unknown>,
        performance: {},
        specs: {},
        features: [],
        sourceType: "manual",
        publishedAt: now,
        primaryImageUrl: photo.url ?? primaryDetail?.primaryImageUrl ?? null,
        primaryImageStorageKey: photo.storageKey ?? primaryDetail?.primaryImageStorageKey ?? null,
        ownerUserId: userId,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    syncedSportSlugs.push(sport.slug);
  }

  return { syncedSportSlugs };
}

export async function getPrimaryOwnedPlayerEntityId(userId: string): Promise<string | null> {
  const db = getDb();
  const [dbUser] = await db
    .select({ sportInterestSlugs: user.sportInterestSlugs })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const interests = filterSportCatalogSlugs(dbUser?.sportInterestSlugs ?? []);
  const owned = await listOwnedPlayerEntities(userId);
  const published = owned.filter((row) => row.status === "published");

  for (const slug of interests) {
    const match = published.find((row) => row.sportSlug === slug);
    if (match) return match.id;
  }

  return published[0]?.id ?? null;
}

export async function getOwnedPlayerEntityIdForSport(
  userId: string,
  sportSlug: string,
): Promise<string | null> {
  const owned = await listOwnedPlayerEntities(userId);
  const match = owned.find(
    (row) => row.sportSlug === sportSlug && row.status === "published",
  );
  return match?.id ?? null;
}
