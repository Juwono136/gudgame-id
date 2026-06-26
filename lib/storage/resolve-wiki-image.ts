import {
  extractStorageObjectKey,
  getMediaProxyPath,
  isAllowedMediaKey,
} from "@/lib/storage/media-url";

function resolveFromStorageKey(key: string): string | null {
  const normalized = key.replace(/^\/+/, "");
  if (!isAllowedMediaKey(normalized)) return null;
  try {
    return getMediaProxyPath(normalized);
  } catch {
    return null;
  }
}

/** Resolve wiki entity image URL (storage key, proxy path, or external HTTPS). */
export function resolveWikiImageUrl(
  url: string | null | undefined,
  storageKey?: string | null,
): string | null {
  const keyCandidate = storageKey?.trim();
  if (keyCandidate) {
    const proxied = resolveFromStorageKey(keyCandidate);
    if (proxied) return proxied;
  }

  if (!url?.trim()) return null;
  const trimmed = url.trim();

  if (trimmed.startsWith("/api/media/")) return trimmed;

  const fromUrl = extractStorageObjectKey(trimmed);
  if (fromUrl) {
    const proxied = resolveFromStorageKey(fromUrl);
    if (proxied) return proxied;
  }

  const asKey = trimmed.replace(/^\/+/, "");
  const proxiedKey = resolveFromStorageKey(asKey);
  if (proxiedKey) return proxiedKey;

  if (trimmed.startsWith("https://")) return trimmed;

  return null;
}
