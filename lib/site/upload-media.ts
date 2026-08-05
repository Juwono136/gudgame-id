import "server-only";

import { deleteObject, uploadObject } from "@/lib/storage/client";
import { deleteStoredObject } from "@/lib/storage/object-lifecycle";
import {
  SITE_MEDIA_PREFIX,
  getMediaProxyPath,
  resolveStorageKey,
} from "@/lib/storage/media-url";
import { logger } from "@/lib/logger";
import { assertSafeImageBuffer } from "@/lib/security/image-magic";
import { readImageDimensions } from "@/lib/site/read-image-dimensions";
import {
  SITE_IMAGE_SPECS,
  SITE_MEDIA_KINDS,
  formatBytes,
  type SiteMediaKind,
} from "@/lib/site/image-specs";

export { SITE_MEDIA_KINDS, type SiteMediaKind };

const log = logger.child({ module: "site-media" });

const SIBLING_EXTS = ["jpg", "jpeg", "png", "webp", "gif"] as const;

export function siteHomepageStableKey(kind: SiteMediaKind, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${SITE_MEDIA_PREFIX}homepage/${kind}/current.${safeExt}`;
}

async function deleteSiblingKeys(kind: SiteMediaKind, keepExt: string): Promise<void> {
  const keep = keepExt.toLowerCase();
  await Promise.all(
    SIBLING_EXTS.map(async (ext) => {
      if (ext === keep) return;
      if (keep === "jpg" && ext === "jpeg") return;
      if (keep === "jpeg" && ext === "jpg") return;
      await deleteObject(siteHomepageStableKey(kind, ext));
    }),
  );
}

/** Remove a previous homepage image from SeaweedFS (stable or legacy UUID key). */
export async function deleteSiteHomepageImage(
  kind: SiteMediaKind,
  previousUrl?: string | null,
): Promise<void> {
  const previousKey = resolveStorageKey(previousUrl);
  if (previousKey?.startsWith(`${SITE_MEDIA_PREFIX}homepage/`)) {
    await deleteStoredObject(previousKey);
  }

  await Promise.all(
    SIBLING_EXTS.map((ext) => deleteObject(siteHomepageStableKey(kind, ext))),
  );

  log.info("Homepage media cleared", { kind, previousKey });
}

export async function uploadSiteHomepageImage(
  file: File,
  kind: SiteMediaKind,
  options?: { previousUrl?: string | null },
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  const spec = SITE_IMAGE_SPECS[kind];
  if (!file || file.size === 0) {
    return { ok: false, error: "No file selected" };
  }
  if (!spec.allowedTypes.includes(file.type)) {
    return { ok: false, error: `${spec.label}: use JPEG, PNG, or WebP only` };
  }
  if (file.size > spec.maxBytes) {
    return {
      ok: false,
      error: `${spec.label} must be ${formatBytes(spec.maxBytes)} or smaller`,
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { mime, ext } = assertSafeImageBuffer(buffer, file.type);

    const dims = readImageDimensions(buffer);
    if (!dims) {
      return { ok: false, error: "Could not read image dimensions" };
    }
    const { width, height } = dims;
    if (width < spec.minWidth || height < spec.minHeight) {
      return {
        ok: false,
        error: `${spec.label} is too small (${width}×${height}px). Minimum ${spec.minWidth}×${spec.minHeight}px; recommended ${spec.recommendedWidth}×${spec.recommendedHeight}px.`,
      };
    }

    // Overwrite a single stable key per kind — avoids orphan UUID duplicates.
    const storageKey = siteHomepageStableKey(kind, ext);
    const previousKey = resolveStorageKey(options?.previousUrl);

    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: mime,
    });

    await deleteSiblingKeys(kind, ext);

    if (
      previousKey &&
      previousKey !== storageKey &&
      previousKey.startsWith(`${SITE_MEDIA_PREFIX}homepage/`)
    ) {
      await deleteStoredObject(previousKey);
    }

    // Cache-bust public URL so browsers pick up the overwritten object.
    const proxyPath = getMediaProxyPath(storageKey);
    const url = `${proxyPath}?v=${Date.now()}`;

    log.info("Homepage media uploaded", { kind, storageKey, width, height });
    return {
      ok: true,
      url,
      storageKey,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Homepage media upload failed", { error: message, kind });
    return { ok: false, error: message };
  }
}
