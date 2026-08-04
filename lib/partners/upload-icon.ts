import "server-only";

import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { assertSafeImageBuffer } from "@/lib/security/image-magic";
import { partnerBrandMediaKey } from "@/lib/storage/media-url";
import { validatePartnerIconFile } from "@/lib/partners/icon-validation";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-icon" });

export { validatePartnerIconFile, PARTNER_ICON_MAX_BYTES } from "@/lib/partners/icon-validation";

export async function uploadPartnerIconImage(
  file: File,
  partnerId: string,
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  const validation = validatePartnerIconFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  try {
    const buffer = Buffer.from(await validation.file.arrayBuffer());
    const { mime, ext } = assertSafeImageBuffer(buffer, validation.file.type);
    const storageKey = partnerBrandMediaKey(partnerId, "icon", ext);
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: mime,
    });
    const url = `${getPublicObjectUrl(storageKey)}?v=${Date.now()}`;
    return {
      ok: true,
      url,
      storageKey,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Partner icon upload failed", { error: message, partnerId });
    return { ok: false, error: message };
  }
}
