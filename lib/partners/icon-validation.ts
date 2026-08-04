/** Partner brand icon / favicon validation (client + server safe). */

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Brand icon max size (product requirement). */
export const PARTNER_ICON_MAX_BYTES = 2 * 1024 * 1024;

export function validatePartnerIconFile(
  file: File | null,
): { ok: true; file: File } | { ok: false; message: string } {
  if (!file || file.size === 0) {
    return { ok: false, message: "No file selected" };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Use JPEG, PNG, WebP, or GIF for the brand icon" };
  }
  if (file.size > PARTNER_ICON_MAX_BYTES) {
    return { ok: false, message: "Brand icon must be 2 MB or smaller" };
  }
  return { ok: true, file };
}
