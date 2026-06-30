import { normalizeScrapeInputUrl } from "@/lib/wiki/scrapers/normalize-url";

/** Canonical key for matching catalog product URLs to wiki entity source_url. */
export function normalizeWikiSourceUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const withProtocol = normalizeScrapeInputUrl(trimmed);
    const parsed = new URL(withProtocol);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, "");
  }
}

export function wikiSourceUrlLookupCandidates(url: string): string[] {
  const key = normalizeWikiSourceUrl(url);
  if (!key) return [];
  return key.endsWith("/") ? [key, key.slice(0, -1)] : [key, `${key}/`];
}
