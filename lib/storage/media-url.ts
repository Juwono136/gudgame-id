/** Client-safe helpers for profile media URLs (no server secrets). */

const MEDIA_API_PREFIX = "/api/media/";

/** Allowed object keys served through the app media proxy */
export const PROFILE_MEDIA_PREFIX = "profiles/";
export const WIKI_MEDIA_PREFIX = "wiki/";
export const SPORTS_MEDIA_PREFIX = "sports/";
export const TOURNAMENTS_MEDIA_PREFIX = "tournaments/";
export const PARTNERS_MEDIA_PREFIX = "partners/";
export const SITE_MEDIA_PREFIX = "site/";

const ALLOWED_MEDIA_PREFIXES = [
  PROFILE_MEDIA_PREFIX,
  WIKI_MEDIA_PREFIX,
  SPORTS_MEDIA_PREFIX,
  TOURNAMENTS_MEDIA_PREFIX,
  PARTNERS_MEDIA_PREFIX,
  SITE_MEDIA_PREFIX,
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
 * Normalize a DB value (key, proxy path, or legacy bucket URL) to an object key.
 * Strips cache-bust query strings (e.g. `?v=…`).
 */
export function resolveStorageKey(
  reference: string | null | undefined,
): string | null {
  if (!reference?.trim()) return null;

  const trimmed = reference.trim().split(/[?#]/)[0] ?? "";
  if (!trimmed) return null;
  const bare = trimmed.replace(/^\/+/, "");

  if (isAllowedMediaKey(bare)) return bare;

  const fromBucketUrl = extractStorageObjectKey(trimmed);
  if (fromBucketUrl && isAllowedMediaKey(fromBucketUrl)) return fromBucketUrl;

  if (trimmed.startsWith(MEDIA_API_PREFIX)) {
    const segments = trimmed
      .slice(MEDIA_API_PREFIX.length)
      .split("/")
      .map((s) => decodeURIComponent(s))
      .join("/");
    if (isAllowedMediaKey(segments)) return segments;
  }

  return null;
}

/** Stable SeaweedFS object key for partner logo / brand icon (overwrite-friendly). */
export function partnerBrandMediaKey(
  partnerId: string,
  kind: "logo" | "icon",
  ext: string,
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `${PARTNERS_MEDIA_PREFIX}${partnerId}/${kind}/brand.${safeExt}`;
}

/** Stable SeaweedFS object key for a partner league brand image. */
export function partnerLeagueBrandMediaKey(
  partnerId: string,
  leagueId: string,
  ext: string,
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `${PARTNERS_MEDIA_PREFIX}${partnerId}/leagues/${leagueId}/brand.${safeExt}`;
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
