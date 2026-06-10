/** Client-safe helpers for profile media URLs (no server secrets). */

const MEDIA_API_PREFIX = "/api/media/";

/** Allowed object keys served through the app media proxy */
export const PROFILE_MEDIA_PREFIX = "profiles/";
export const WIKI_MEDIA_PREFIX = "wiki/";
export const SPORTS_MEDIA_PREFIX = "sports/";
export const TOURNAMENTS_MEDIA_PREFIX = "tournaments/";

const ALLOWED_MEDIA_PREFIXES = [
  PROFILE_MEDIA_PREFIX,
  WIKI_MEDIA_PREFIX,
  SPORTS_MEDIA_PREFIX,
  TOURNAMENTS_MEDIA_PREFIX,
] as const;

export function isAllowedMediaKey(key: string): boolean {
  const normalized = key.replace(/^\/+/, "");
  if (normalized.includes("..") || normalized.includes("\\")) return false;
  return ALLOWED_MEDIA_PREFIXES.some((p) => normalized.startsWith(p));
}

export function getMediaProxyPath(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  if (!isAllowedMediaKey(normalized)) {
    throw new Error("Invalid media key");
  }
  return `${MEDIA_API_PREFIX}${normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

/**
 * Extracts object key from a legacy direct SeaweedFS/nginx URL
 * (e.g. http://localhost:8333/buckets/court-pedia/profiles/…).
 */
export function extractStorageObjectKey(urlOrPath: string): string | null {
  try {
    const pathname = urlOrPath.startsWith("http")
      ? new URL(urlOrPath).pathname
      : urlOrPath.startsWith("/")
        ? urlOrPath
        : `/${urlOrPath}`;

    const match = pathname.match(/\/buckets\/[^/]+\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Resolves a stored user.image value to a same-origin URL the browser can load
 * without nginx basic auth prompts.
 */
export function resolveUserImageUrl(
  image: string | null | undefined,
): string | null {
  if (!image?.trim()) return null;

  const trimmed = image.trim();
  const storageKey = extractStorageObjectKey(trimmed);
  if (storageKey && isAllowedMediaKey(storageKey)) {
    return getMediaProxyPath(storageKey);
  }

  if (trimmed.startsWith(MEDIA_API_PREFIX)) return trimmed;

  const asKey = trimmed.replace(/^\/+/, "");
  if (isAllowedMediaKey(asKey)) {
    try {
      return getMediaProxyPath(asKey);
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("https://")) return trimmed;

  return null;
}
