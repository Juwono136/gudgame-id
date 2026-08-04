import "server-only";

import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { assertSafeImageBuffer } from "@/lib/security/image-magic";
import { partnerBrandMediaKey } from "@/lib/storage/media-url";
import { validatePartnerLogoFile } from "@/lib/partners/logo-validation";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-logo" });

export { validatePartnerLogoFile, PARTNER_LOGO_MAX_BYTES } from "@/lib/partners/logo-validation";

export async function uploadPartnerLogoImage(
  file: File,
  partnerId: string,
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  const validation = validatePartnerLogoFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  try {
    const buffer = Buffer.from(await validation.file.arrayBuffer());
    const { mime, ext } = assertSafeImageBuffer(buffer, validation.file.type);
    // Stable key → SeaweedFS PUT overwrites same object (no UUID pile-up).
    const storageKey = partnerBrandMediaKey(partnerId, "logo", ext);
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: mime,
    });
    // Cache-bust so browsers reload after overwrite of the stable key.
    const url = `${getPublicObjectUrl(storageKey)}?v=${Date.now()}`;
    return {
      ok: true,
      url,
      storageKey,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Partner logo upload failed", { error: message, partnerId });
    return { ok: false, error: message };
  }
}
