/** Partner logo validation (client + server safe). */

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Partner logo max size (product requirement). */
export const PARTNER_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function validatePartnerLogoFile(
  file: File | null,
): { ok: true; file: File } | { ok: false; message: string } {
  if (!file || file.size === 0) {
    return { ok: false, message: "No file selected" };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Use JPEG, PNG, WebP, or GIF" };
  }
  if (file.size > PARTNER_LOGO_MAX_BYTES) {
    return { ok: false, message: "Logo must be 5 MB or smaller" };
  }
  return { ok: true, file };
}
