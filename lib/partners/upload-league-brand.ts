import "server-only";

import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { assertSafeImageBuffer } from "@/lib/security/image-magic";
import { partnerLeagueBrandMediaKey } from "@/lib/storage/media-url";
import { validatePartnerLogoFile } from "@/lib/partners/logo-validation";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-league-brand" });

export async function uploadPartnerLeagueBrandImage(
  file: File,
  partnerId: string,
  leagueId: string,
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  const validation = validatePartnerLogoFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  try {
    const buffer = Buffer.from(await validation.file.arrayBuffer());
    const { mime, ext } = assertSafeImageBuffer(buffer, validation.file.type);
    const storageKey = partnerLeagueBrandMediaKey(partnerId, leagueId, ext);
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: mime,
    });
    const url = `${getPublicObjectUrl(storageKey)}?v=${Date.now()}`;
    return { ok: true, url, storageKey };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Partner league brand upload failed", {
      error: message,
      partnerId,
      leagueId,
    });
    return { ok: false, error: message };
  }
}
