import "server-only";

import { randomUUID } from "crypto";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { TOURNAMENTS_MEDIA_PREFIX } from "@/lib/storage/media-url";
import { validateWikiImageFile } from "@/lib/wiki/upload-media";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "tournament-sponsor-banner" });

export async function uploadTournamentSponsorBanner(
  file: File,
  sportSlug: string,
  tournamentId: string,
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
    const storageKey = `${TOURNAMENTS_MEDIA_PREFIX}${sportSlug}/${tournamentId}/sponsors/${randomUUID()}.${ext}`;
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
    log.error("Tournament sponsor banner upload failed", {
      error: message,
      sportSlug,
      tournamentId,
    });
    return { ok: false, error: message };
  }
}
