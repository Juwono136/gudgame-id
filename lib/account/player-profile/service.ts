import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sports, wikiEntities, wikiEntityMedia } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { getWikiEntityById } from "@/lib/wiki/service";
import { ensureDefaultSports } from "@/lib/sports/ensure-default-sport";
import { getSportBySlug } from "@/lib/wiki/public";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { uploadWikiImage, validateWikiImageFile } from "@/lib/wiki/upload-media";
import {
  collectEquipmentStorageRefs,
  equipmentFromAttributes,
  mergeEquipmentIntoAttributes,
  type PlayerEquipmentItem,
} from "@/lib/wiki/player-equipment";
import {
  PLAYER_GALLERY_MAX,
} from "@/lib/wiki/constants";
import {
  getPrimaryOwnedPlayerEntityId,
  getOwnedPlayerEntityIdForSport,
  listOwnedPlayerEntities,
  syncOwnedPlayerProfilesFromSportInterests,
} from "@/lib/account/player-profile/sync-owned-profiles";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import {
  deleteStoredObjectIfReplaced,
  deleteStoredObjects,
  resolveStorageKey,
} from "@/lib/storage/object-lifecycle";
import type { PlayerProfileUpsertInput } from "@/lib/validations/account-settings";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  mergePlayerEditableAttributes,
  parsePlayerEditableAttributes,
  type PlayerSocialLink,
} from "@/lib/wiki/player-profile-fields";
import {
  getPlayerCareerStats,
  getSignatureGearItem,
} from "@/lib/wiki/player-career-stats";
import {
  enrichEquipmentFromCatalog,
  migrateAndResolvePlayerEquipment,
} from "@/lib/wiki/gear/equipment-resolve";
import { validatePlayerGearLinks } from "@/lib/wiki/gear/player-create";
import { requirePlayerDisplayNameForUser } from "@/lib/account/player-profile/resolve-display-name";
import { getUserPhotoForWiki } from "@/lib/account/player-profile/sync-primary-photo";
import { resolvePlayerCareerStats } from "@/lib/account/player-performance/resolve-career-stats";

export type PlayerWikiProfileView = {
  id: string;
  sportSlug: string;
  sportName: string;
  slug: string;
  displayName: string;
  summary: string | null;
  biography: string | null;
  status: string;
  primaryImageUrl: string | null;
  nationality: string | null;
  age: number | null;
  socialLinks: PlayerSocialLink[];
  signatureGearId: string | null;
  signatureGear: PlayerEquipmentItem | null;
  yearsActive: string | null;
  careerStats: ReturnType<typeof getPlayerCareerStats>;
  attributes: Record<string, unknown>;
  performance: Record<string, unknown>;
  equipment: PlayerEquipmentItem[];
  gallery: {
    id?: string;
    url: string | null;
    storageKey?: string | null;
    caption: string | null;
    sortOrder: number;
  }[];
  publicUrl: string;
  updatedAt: string;
};

function mapPlayerProfile(detail: NonNullable<Awaited<ReturnType<typeof getWikiEntityById>>>): PlayerWikiProfileView {
  const equipment = equipmentFromAttributes(detail.attributes);
  const editable = parsePlayerEditableAttributes(detail.attributes);
  const careerStats = getPlayerCareerStats(detail);

  return {
    id: detail.id,
    sportSlug: detail.sportSlug,
    sportName: detail.sportName,
    slug: detail.slug,
    displayName: detail.displayName,
    summary: detail.summary,
    biography: detail.biography,
    status: detail.status,
    primaryImageUrl: resolveWikiImageUrl(detail.primaryImageUrl),
    nationality: editable.nationality ?? null,
    age: editable.age ?? null,
    socialLinks: editable.socialLinks ?? [],
    signatureGearId: editable.signatureGearId ?? null,
    signatureGear: getSignatureGearItem(detail.attributes),
    yearsActive: careerStats.yearsActive,
    careerStats,
    attributes: detail.attributes,
    performance: detail.performance,
    equipment,
    gallery: detail.gallery.map((g) => ({
      id: g.id,
      url: resolveWikiImageUrl(g.url),
      storageKey: null,
      caption: g.caption,
      sortOrder: g.sortOrder,
    })),
    publicUrl: publicSportRoutes.player(detail.sportSlug, detail.slug),
    updatedAt: detail.updatedAt,
  };
}

function buildPlayerAttributes(
  existing: Record<string, unknown>,
  input: PlayerProfileUpsertInput,
  equipment: PlayerEquipmentItem[],
): Record<string, unknown> {
  const withEquipment = mergeEquipmentIntoAttributes(existing, equipment);
  const age =
    input.age === "" || input.age === undefined || input.age === null
      ? null
      : Number(input.age);

  return mergePlayerEditableAttributes(withEquipment, {
    nationality: input.nationality?.trim() ?? "",
    age: Number.isFinite(age) ? age : null,
    socialLinks: input.socialLinks,
    signatureGearId: input.signatureGearId || null,
  });
}

export async function getPlayerWikiEntityIdForUser(userId: string): Promise<string | null> {
  return getPrimaryOwnedPlayerEntityId(userId);
}

export async function getPlayerWikiProfileForUser(
  userId: string,
  sportSlug?: string,
  options?: { skipSync?: boolean },
): Promise<PlayerWikiProfileView | null> {
  if (!options?.skipSync) {
    try {
      await syncOwnedPlayerProfilesFromSportInterests(userId);
    } catch (err) {
      // Settings must still load account fields even if wiki sync fails
      // (e.g. missing UUID default before migration 0027).
      console.error(
        "[player-profile] syncOwnedPlayerProfilesFromSportInterests failed",
        err instanceof Error ? err.message : err,
      );
    }
  }
  const entityId = sportSlug
    ? await getOwnedPlayerEntityIdForSport(userId, sportSlug)
    : await getPrimaryOwnedPlayerEntityId(userId);
  if (!entityId) return null;
  const detail = await getWikiEntityById(entityId);
  if (!detail) return null;

  const view = mapPlayerProfile(detail);
  const sport = await getSportBySlug(detail.sportSlug);
  if (!sport) return view;

  const equipment = await migrateAndResolvePlayerEquipment(
    sport.id,
    detail.sportSlug,
    view.equipment,
    userId,
  );

  const careerStats = await resolvePlayerCareerStats({
    entity: detail,
    ownerUserId: userId,
    sportId: sport.id,
  });

  return { ...view, equipment, careerStats };
}

async function uploadEquipmentImages(
  equipment: PlayerEquipmentItem[],
  equipmentFiles: Map<string, File>,
  sportSlug: string,
): Promise<PlayerEquipmentItem[]> {
  const result: PlayerEquipmentItem[] = [];

  for (const item of equipment) {
    const file = equipmentFiles.get(item.id);
    if (!file) {
      result.push(item);
      continue;
    }

    const validation = validateWikiImageFile(file);
    if (!validation.ok) {
      throw new AppError(validation.message, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const upload = await uploadWikiImage(validation.file, sportSlug, "player");
    if (!upload.ok) {
      throw new AppError(upload.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }

    result.push({
      ...item,
      imageUrl: upload.url,
      imageStorageKey: upload.storageKey,
    });
  }

  return result;
}

async function syncEquipmentStorage(
  previous: PlayerEquipmentItem[],
  next: PlayerEquipmentItem[],
) {
  const prevRefs = new Set(collectEquipmentStorageRefs(previous).map((r) => resolveStorageKey(r)).filter(Boolean));
  const nextRefs = new Set(collectEquipmentStorageRefs(next).map((r) => resolveStorageKey(r)).filter(Boolean));
  const removed = [...prevRefs].filter((k) => k && !nextRefs.has(k)) as string[];
  await deleteStoredObjects(removed);
}

async function syncPlayerGallery(
  entityId: string,
  gallery: PlayerProfileUpsertInput["gallery"],
) {
  const db = getDb();

  const existingMedia = await db
    .select({
      storageKey: wikiEntityMedia.storageKey,
      url: wikiEntityMedia.url,
    })
    .from(wikiEntityMedia)
    .where(eq(wikiEntityMedia.entityId, entityId));

  const items = gallery.filter((g) => g.url || g.storageKey);

  const previousKeys = new Set(
    existingMedia
      .map((m) => resolveStorageKey(m.storageKey ?? m.url))
      .filter((k): k is string => Boolean(k)),
  );
  const nextKeys = new Set(
    items
      .map((g) => resolveStorageKey(g.storageKey ?? g.url))
      .filter((k): k is string => Boolean(k)),
  );
  const removedKeys = [...previousKeys].filter((key) => !nextKeys.has(key));

  await db.delete(wikiEntityMedia).where(eq(wikiEntityMedia.entityId, entityId));

  if (items.length > 0) {
    await db.insert(wikiEntityMedia).values(
      items.map((g, i) => ({
        entityId,
        url: g.url ?? null,
        storageKey: g.storageKey ?? null,
        caption: g.caption ?? null,
        sortOrder: g.sortOrder ?? i,
        mediaType: "image",
      })),
    );
  }

  await deleteStoredObjects(removedKeys);
}

function parseEquipmentFiles(formData: FormData): Map<string, File> {
  const map = new Map<string, File>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("equipmentImage_") && value instanceof File && value.size > 0) {
      const id = key.slice("equipmentImage_".length);
      map.set(id, value);
    }
  }
  return map;
}

function parseGalleryFiles(formData: FormData): File[] {
  return formData
    .getAll("galleryImages")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, PLAYER_GALLERY_MAX);
}

export async function upsertPlayerWikiProfile(
  userId: string,
  input: PlayerProfileUpsertInput,
  formData: FormData,
  options: { create: boolean },
): Promise<PlayerWikiProfileView> {
  await ensureDefaultSports();
  await syncOwnedPlayerProfilesFromSportInterests(userId);

  const owned = await listOwnedPlayerEntities(userId);
  const publishedOwned = owned.filter((row) => row.status === "published");

  if (options.create && publishedOwned.length > 0) {
    throw new AppError("You already have a player profile", {
      code: "VALIDATION_ERROR",
      statusCode: 409,
    });
  }

  const primaryEntityId = await getPrimaryOwnedPlayerEntityId(userId);
  if (!primaryEntityId) {
    throw new AppError(
      "No player profile could be created. Select sports you follow in Settings and ask an admin to enable those sports on the platform.",
      {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: {
          fieldErrors: {
            sportInterests: [
              "Choose at least one sport in Settings that is already enabled on Gud Game.",
            ],
          },
        },
      },
    );
  }

  const primaryDetail = await getWikiEntityById(primaryEntityId);
  if (!primaryDetail) {
    throw new AppError("Player profile not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const sport = await getSportBySlug(primaryDetail.sportSlug);
  if (!sport) {
    throw new AppError("Sport not found for player profile", { code: "NOT_FOUND", statusCode: 404 });
  }

  const equipmentFiles = parseEquipmentFiles(formData);
  let equipment = await uploadEquipmentImages(
    input.equipment,
    equipmentFiles,
    sport.slug,
  );

  for (const row of publishedOwned) {
    await validatePlayerGearLinks(row.sportId, equipment);
  }

  equipment = await enrichEquipmentFromCatalog(sport.id, sport.slug, equipment);

  const db = getDb();
  const displayName = await requirePlayerDisplayNameForUser(userId);
  const accountPhoto = await getUserPhotoForWiki(userId);

  const galleryFiles = parseGalleryFiles(formData);
  const keptGallery = input.gallery.filter((g) => g.url || g.storageKey);
  const uploadedGallery: PlayerProfileUpsertInput["gallery"] = [];

  for (let i = 0; i < galleryFiles.length; i++) {
    const file = galleryFiles[i]!;
    const v = validateWikiImageFile(file);
    if (!v.ok) {
      throw new AppError(`Gallery: ${v.message}`, { code: "VALIDATION_ERROR", statusCode: 422 });
    }
    const up = await uploadWikiImage(v.file, sport.slug, "player");
    if (!up.ok) {
      throw new AppError(up.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }
    uploadedGallery.push({
      url: up.url,
      storageKey: up.storageKey,
      sortOrder: keptGallery.length + i,
    });
  }

  const totalGallery = [...keptGallery, ...uploadedGallery].slice(0, PLAYER_GALLERY_MAX);
  const biography = input.biography ? sanitizeRichText(input.biography) : null;
  const summary = input.summary ? sanitizeRichText(input.summary) : null;

  const [primaryRow] = await db
    .select()
    .from(wikiEntities)
    .where(and(eq(wikiEntities.id, primaryEntityId), eq(wikiEntities.ownerUserId, userId)))
    .limit(1);

  if (!primaryRow) {
    throw new AppError("Player profile not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const previousEquipment = equipmentFromAttributes(
    (primaryRow.attributes ?? {}) as Record<string, unknown>,
  );
  equipment = await Promise.resolve(equipment).then(async (next) => {
    await syncEquipmentStorage(previousEquipment, next);
    return next;
  });

  for (const item of equipment) {
    const prev = previousEquipment.find((p) => p.id === item.id);
    if (prev) {
      await deleteStoredObjectIfReplaced(
        prev.imageStorageKey ?? prev.imageUrl,
        item.imageStorageKey ?? item.imageUrl,
      );
    }
  }

  const mergedAttributes = buildPlayerAttributes(
    (primaryRow.attributes ?? {}) as Record<string, unknown>,
    input,
    equipment,
  );

  const entityIds = publishedOwned.map((row) => row.id);
  const now = new Date();

  await db
    .update(wikiEntities)
    .set({
      displayName,
      summary,
      biography,
      attributes: mergedAttributes,
      primaryImageUrl: accountPhoto.url ?? primaryRow.primaryImageUrl,
      primaryImageStorageKey: accountPhoto.storageKey ?? primaryRow.primaryImageStorageKey,
      updatedBy: userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(wikiEntities.ownerUserId, userId),
        eq(wikiEntities.entityType, "player"),
      ),
    );

  for (const entityId of entityIds) {
    await syncPlayerGallery(entityId, totalGallery);
  }

  const detail = await getWikiEntityById(primaryEntityId);
  if (!detail) {
    throw new AppError("Player profile not found after save", { code: "NOT_FOUND", statusCode: 404 });
  }
  return mapPlayerProfile(detail);
}
