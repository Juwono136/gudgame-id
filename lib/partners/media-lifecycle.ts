import "server-only";

import {
  deleteStoredObject,
  resolveStorageKey,
} from "@/lib/storage/object-lifecycle";
import {
  partnerBrandMediaKey,
  partnerLeagueBrandMediaKey,
} from "@/lib/storage/media-url";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-media-lifecycle" });

const BRAND_EXTS = ["png", "jpg", "jpeg", "webp", "gif"] as const;

export type PartnerMediaKind = "logo" | "icon";

export { partnerBrandMediaKey, partnerLeagueBrandMediaKey };

/**
 * Remove previous logo/icon objects for a partner so SeaweedFS does not keep
 * orphaned duplicates after replace or remove.
 */
export async function cleanupPartnerBrandMedia(input: {
  partnerId: string;
  kind: PartnerMediaKind;
  /** Keep this key (the newly uploaded object). */
  keepKey?: string | null;
  /** Legacy DB storage key (UUID path from older uploads). */
  previousStorageKey?: string | null;
  /** Legacy public URL / proxy path — resolve and delete if different. */
  previousUrl?: string | null;
}): Promise<void> {
  const keep = resolveStorageKey(input.keepKey);
  const candidates = new Set<string>();

  for (const ext of BRAND_EXTS) {
    candidates.add(partnerBrandMediaKey(input.partnerId, input.kind, ext));
  }

  const prevKey = resolveStorageKey(input.previousStorageKey);
  if (prevKey) candidates.add(prevKey);

  const prevUrlKey = resolveStorageKey(input.previousUrl);
  if (prevUrlKey) candidates.add(prevUrlKey);

  const toDelete = [...candidates].filter((key) => key !== keep);
  if (toDelete.length === 0) return;

  log.info("Cleaning partner brand media", {
    partnerId: input.partnerId,
    kind: input.kind,
    keep: keep ?? null,
    deleteCount: toDelete.length,
  });

  await Promise.all(toDelete.map((key) => deleteStoredObject(key)));
}

/** Remove previous league brand images after replace or remove. */
export async function cleanupPartnerLeagueBrandMedia(input: {
  partnerId: string;
  leagueId: string;
  keepKey?: string | null;
  previousStorageKey?: string | null;
  previousUrl?: string | null;
}): Promise<void> {
  const keep = resolveStorageKey(input.keepKey);
  const candidates = new Set<string>();

  for (const ext of BRAND_EXTS) {
    candidates.add(partnerLeagueBrandMediaKey(input.partnerId, input.leagueId, ext));
  }

  const prevKey = resolveStorageKey(input.previousStorageKey);
  if (prevKey) candidates.add(prevKey);

  const prevUrlKey = resolveStorageKey(input.previousUrl);
  if (prevUrlKey) candidates.add(prevUrlKey);

  const toDelete = [...candidates].filter((key) => key !== keep);
  if (toDelete.length === 0) return;

  log.info("Cleaning partner league brand media", {
    partnerId: input.partnerId,
    leagueId: input.leagueId,
    keep: keep ?? null,
    deleteCount: toDelete.length,
  });

  await Promise.all(toDelete.map((key) => deleteStoredObject(key)));
}
