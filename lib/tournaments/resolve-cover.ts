import { getMediaProxyPath, isAllowedMediaKey } from "@/lib/storage/media-url";
import { extractStorageObjectKey } from "@/lib/storage/media-url";

export function resolveTournamentCoverUrl(
  coverImageUrl: string | null | undefined,
  coverImageStorageKey: string | null | undefined,
): string | null {
  const key = coverImageStorageKey?.trim();
  if (key && isAllowedMediaKey(key.replace(/^\/+/, ""))) {
    try {
      return getMediaProxyPath(key.replace(/^\/+/, ""));
    } catch {
      /* fall through */
    }
  }

  const url = coverImageUrl?.trim();
  if (!url) return null;

  if (url.startsWith("/api/media/")) return url;

  const fromKey = extractStorageObjectKey(url);
  if (fromKey && isAllowedMediaKey(fromKey)) {
    try {
      return getMediaProxyPath(fromKey);
    } catch {
      return null;
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return null;
}
