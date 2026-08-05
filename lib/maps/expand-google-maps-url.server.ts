import "server-only";

import { isGoogleMapsHttpsUrl } from "@/lib/maps/google-maps-url";

const DEFAULT_TIMEOUT_MS = 4_500;
const MAX_REDIRECTS = 6;

/**
 * Follow Google Maps short-link redirects safely (SSRF-hardened).
 * Only https + Google Maps hostnames are allowed at every hop.
 */
export async function expandGoogleMapsUrl(
  mapsUrl: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const initial = mapsUrl.trim();
  if (!initial || !isGoogleMapsHttpsUrl(initial)) return initial;

  // Full place/coords URLs don't need expansion.
  try {
    const parsed = new URL(initial);
    if (
      parsed.hostname.includes("google.") &&
      (parsed.pathname.includes("/maps/place/") ||
        parsed.pathname.includes("/maps/@") ||
        parsed.searchParams.has("q") ||
        parsed.searchParams.has("query"))
    ) {
      return initial;
    }
  } catch {
    return initial;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let current = initial;

    for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
      if (!isGoogleMapsHttpsUrl(current)) return initial;

      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; GudGameMaps/1.0)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")?.trim();
        if (!location) return current;

        let nextUrl: string;
        try {
          nextUrl = new URL(location, current).href;
        } catch {
          return current;
        }

        if (!isGoogleMapsHttpsUrl(nextUrl)) return current;
        current = nextUrl;
        continue;
      }

      // Some environments expose the final URL on response.url even with manual redirects.
      if (response.url && isGoogleMapsHttpsUrl(response.url)) {
        return response.url;
      }

      return current;
    }

    return current;
  } catch {
    return initial;
  } finally {
    clearTimeout(timer);
  }
}
