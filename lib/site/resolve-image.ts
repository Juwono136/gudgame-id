import { resolveUserImageUrl } from "@/lib/storage/media-url";

/**
 * Resolve a CMS image reference (static `/images/…`, media proxy, or storage key)
 * for use in next/image and `<img>`.
 */
export function resolveSiteImageUrl(
  url: string | null | undefined,
  fallback: string,
): string {
  if (!url?.trim()) return fallback;
  const trimmed = url.trim();

  if (trimmed.startsWith("/images/") || trimmed.startsWith("/favicon")) {
    return trimmed;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("/api/")) {
    return trimmed;
  }

  return resolveUserImageUrl(trimmed) ?? fallback;
}
