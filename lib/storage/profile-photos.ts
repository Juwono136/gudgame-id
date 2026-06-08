import "server-only";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";

const log = logger.child({ module: "storage-profile-photos" });

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ProfilePhotoUploadResult = {
  /** Same-origin URL via /api/media (stored in DB, not binary) */
  publicUrl: string;
  /** Object key inside STORAGE_BUCKET — for admin/delete operations */
  storageKey: string;
};

/**
 * Uploads avatar bytes to SeaweedFS. Database should only persist URL + key.
 */
export async function uploadProfilePhotoToStorage(
  file: File,
  email: string,
): Promise<
  { ok: true; data: ProfilePhotoUploadResult } | { ok: false; error: string }
> {
  try {
    const ext = EXT_BY_MIME[file.type] ?? "jpg";
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48);
    const storageKey = `profiles/${safeEmail}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { key, bucket } = await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: file.type,
    });

    const publicUrl = getPublicObjectUrl(key);

    log.info("Profile photo stored in object storage", {
      bucket,
      key,
      bytes: buffer.length,
    });

    return {
      ok: true,
      data: { publicUrl, storageKey: key },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Profile photo upload failed", { error: message });
    return { ok: false, error: message };
  }
}
