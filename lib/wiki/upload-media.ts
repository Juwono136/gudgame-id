import "server-only";

import { randomUUID } from "crypto";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "wiki-media" });

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 10 * 1024 * 1024;

export function validateWikiImageFile(
  file: File | null,
): { ok: true; file: File } | { ok: false; message: string } {
  if (!file || file.size === 0) {
    return { ok: false, message: "No file selected" };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Use JPEG, PNG, WebP, or GIF" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Image must be 10 MB or smaller" };
  }
  return { ok: true, file };
}

export async function uploadWikiImage(
  file: File,
  sportSlug: string,
  entityType: string,
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  try {
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const storageKey = `wiki/${sportSlug}/${entityType}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: file.type,
    });
    return {
      ok: true,
      url: getPublicObjectUrl(storageKey),
      storageKey,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Wiki image upload failed", { error: message });
    return { ok: false, error: message };
  }
}
