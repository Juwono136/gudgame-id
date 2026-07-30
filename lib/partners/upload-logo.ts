import "server-only";

import { randomUUID } from "crypto";
import { getPublicObjectUrl, uploadObject } from "@/lib/storage/client";
import { PARTNERS_MEDIA_PREFIX } from "@/lib/storage/media-url";
import { assertSafeImageBuffer } from "@/lib/security/image-magic";
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
    const storageKey = `${PARTNERS_MEDIA_PREFIX}${partnerId}/logo/${randomUUID()}.${ext}`;
    await uploadObject({
      key: storageKey,
      body: buffer,
      contentType: mime,
    });
    return {
      ok: true,
      url: getPublicObjectUrl(storageKey),
      storageKey,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("Partner logo upload failed", { error: message, partnerId });
    return { ok: false, error: message };
  }
}
