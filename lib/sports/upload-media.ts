import "server-only";

import { randomUUID } from "crypto";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { logger } from "@/lib/logger";
import { validateWikiImageFile } from "@/lib/wiki/upload-media";

const log = logger.child({ module: "sport-media" });

export async function uploadSportHeroImage(
  file: File,
  sportSlug: string,
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  const validation = validateWikiImageFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  try {
    const ext =
      validation.file.type === "image/png"
        ? "png"
        : validation.file.type === "image/webp"
          ? "webp"
          : validation.file.type === "image/gif"
            ? "gif"
            : "jpg";
    const storageKey = `sports/${sportSlug}/hero/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await validation.file.arrayBuffer());
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: validation.file.type,
    });
    return {
      ok: true,
      url: getPublicObjectUrl(storageKey),
      storageKey,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Sport hero upload failed", { error: message, sportSlug });
    return { ok: false, error: message };
  }
}
