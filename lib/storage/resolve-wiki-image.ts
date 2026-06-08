import {
  extractStorageObjectKey,
  getMediaProxyPath,
  isAllowedMediaKey,
} from "@/lib/storage/media-url";

/** Resolve wiki entity image URL (storage key, proxy path, or external HTTPS). */
export function resolveWikiImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();

  if (trimmed.startsWith("/api/media/")) return trimmed;

  const key = extractStorageObjectKey(trimmed) ?? trimmed.replace(/^\/+/, "");
  if (isAllowedMediaKey(key)) {
    try {
      return getMediaProxyPath(key);
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return null;
}
