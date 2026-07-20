import "server-only";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { assertSafeImageBuffer } from "@/lib/security/image-magic";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";

const log = logger.child({ module: "storage-profile-photos" });

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const { mime, ext } = assertSafeImageBuffer(buffer, file.type);
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48);
    const storageKey = `profiles/${safeEmail}/${randomUUID()}.${ext}`;

    const { key, bucket } = await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: mime,
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
