import "server-only";

import { randomUUID } from "crypto";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "storage-import-remote-image" });

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Downloads a remote avatar (e.g. Google profile photo) into object storage.
 */
export async function importRemoteProfilePhoto(
  remoteUrl: string,
  email: string,
): Promise<{ publicUrl: string; storageKey: string } | null> {
  try {
    const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      log.warn("Remote profile photo fetch failed", { status: res.status });
      return null;
    }

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    if (!EXT_BY_MIME[contentType]) {
      log.warn("Unsupported remote profile content type", { contentType });
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      log.warn("Remote profile photo size invalid", { bytes: buffer.length });
      return null;
    }

    const ext = EXT_BY_MIME[contentType];
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48);
    const storageKey = `profiles/${safeEmail}/${randomUUID()}.${ext}`;

    const { key } = await uploadObject({
      key: storageKey,
      body: buffer,
      contentType,
    });

    return {
      publicUrl: getPublicObjectUrl(key),
      storageKey: key,
    };
  } catch (err) {
    log.warn("Remote profile photo import failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
