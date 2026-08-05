import "server-only";

/**
 * Lightweight dimension probe for JPEG / PNG / WebP (no extra dependency).
 */
export function readImageDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  // WebP (RIFF....WEBP)
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      const w = 1 + buffer.readUIntLE(24, 3);
      const h = 1 + buffer.readUIntLE(27, 3);
      return { width: w, height: h };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      // Lossy bitstream starts at offset 20; frame tag then width/height at 26
      const w = buffer.readUInt16LE(26) & 0x3fff;
      const h = buffer.readUInt16LE(28) & 0x3fff;
      return { width: w, height: h };
    }
    if (chunk === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      const w = (bits & 0x3fff) + 1;
      const h = ((bits >> 14) & 0x3fff) + 1;
      return { width: w, height: h };
    }
  }

  // JPEG — scan for SOF0/SOF2
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const size = buffer.readUInt16BE(offset + 2);
      if (size < 2) break;
      // Baseline / progressive DCT
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + size;
    }
  }

  return null;
}
