import "server-only";

import { deleteObject } from "@/lib/storage/client";
import {
  extractStorageObjectKey,
  isAllowedMediaKey,
} from "@/lib/storage/media-url";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "storage-object-lifecycle" });

const MEDIA_API_PREFIX = "/api/media/";

/** Normalize a DB value (key, proxy path, or legacy bucket URL) to an object key. */
export function resolveStorageKey(
  reference: string | null | undefined,
): string | null {
  if (!reference?.trim()) return null;

  const trimmed = reference.trim();
  const bare = trimmed.replace(/^\/+/, "");

  if (isAllowedMediaKey(bare)) return bare;

  const fromBucketUrl = extractStorageObjectKey(trimmed);
  if (fromBucketUrl && isAllowedMediaKey(fromBucketUrl)) return fromBucketUrl;

  if (trimmed.startsWith(MEDIA_API_PREFIX)) {
    const segments = trimmed
      .slice(MEDIA_API_PREFIX.length)
      .split("/")
      .map((s) => decodeURIComponent(s))
      .join("/");
    if (isAllowedMediaKey(segments)) return segments;
  }

  return null;
}

/**
 * Deletes one object from SeaweedFS. Best-effort — logs failures, never throws.
 * Only keys under allowed prefixes (profiles/, wiki/) are removed.
 */
export async function deleteStoredObject(
  keyOrReference: string | null | undefined,
): Promise<boolean> {
  const key = resolveStorageKey(keyOrReference);
  if (!key) return false;

  const ok = await deleteObject(key);
  if (ok) {
    log.info("Object deleted from storage", { key });
  } else {
    log.warn("Object delete failed or object missing", { key });
  }
  return ok;
}

export async function deleteStoredObjects(
  keysOrReferences: Iterable<string | null | undefined>,
): Promise<void> {
  const unique = new Set<string>();
  for (const ref of keysOrReferences) {
    const key = resolveStorageKey(ref);
    if (key) unique.add(key);
  }
  await Promise.all([...unique].map((key) => deleteStoredObject(key)));
}

/** Removes the previous object when a new upload replaces it. */
export async function deleteStoredObjectIfReplaced(
  previousKey: string | null | undefined,
  nextKey: string | null | undefined,
): Promise<void> {
  const prev = resolveStorageKey(previousKey);
  const next = resolveStorageKey(nextKey);
  if (!prev || prev === next) return;
  await deleteStoredObject(prev);
}

export async function deleteUserProfileMediaFromStorage(user: {
  imageStorageKey?: string | null;
  image?: string | null;
}): Promise<void> {
  await deleteStoredObjects([
    user.imageStorageKey,
    user.image,
  ]);
}

export function collectWikiEntityStorageKeys(entity: {
  heroImageStorageKey?: string | null;
  primaryImageStorageKey?: string | null;
  heroImageUrl?: string | null;
  primaryImageUrl?: string | null;
}, gallery: { storageKey?: string | null; url?: string | null }[]): string[] {
  const keys: string[] = [];

  for (const ref of [
    entity.heroImageStorageKey,
    entity.primaryImageStorageKey,
    entity.heroImageUrl,
    entity.primaryImageUrl,
  ]) {
    const key = resolveStorageKey(ref);
    if (key) keys.push(key);
  }

  for (const item of gallery) {
    const key = resolveStorageKey(item.storageKey ?? item.url);
    if (key) keys.push(key);
  }

  return keys;
}
