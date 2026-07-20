import "server-only";

/**
 * Detect image MIME from magic bytes (does not trust client Content-Type).
 */
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function assertSafeImageBuffer(
  buffer: Buffer,
  claimedType?: string | null,
): { mime: string; ext: string } {
  const detected = detectImageMimeFromBuffer(buffer);
  if (!detected || !ALLOWED_IMAGE_MIMES.has(detected)) {
    throw new Error("File is not a valid JPEG, PNG, WebP, or GIF image");
  }

  if (claimedType && claimedType !== detected && ALLOWED_IMAGE_MIMES.has(claimedType)) {
    // Prefer bytes over spoofed Content-Type when both look like images but disagree.
  }

  const ext =
    detected === "image/png"
      ? "png"
      : detected === "image/webp"
        ? "webp"
        : detected === "image/gif"
          ? "gif"
          : "jpg";

  return { mime: detected, ext };
}
