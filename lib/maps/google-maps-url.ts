/** Parse Google Maps share URLs into embed-friendly query strings (coords or place name). */

function extractCoordsFromUrl(url: string): string | null {
  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return `${atMatch[1]},${atMatch[2]}`;
  }

  const data3d = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (data3d) {
    return `${data3d[1]},${data3d[2]}`;
  }

  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get("q")?.trim();
    if (q && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(q)) {
      return q;
    }
    const ll = parsed.searchParams.get("ll")?.trim();
    if (ll && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(ll)) {
      return ll;
    }
    const center = parsed.searchParams.get("center")?.trim();
    if (center && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(center)) {
      return center;
    }
  } catch {
    /* ignore invalid URLs */
  }

  return null;
}

function extractPlaceNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const placeMatch = parsed.pathname.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }
    const q = parsed.searchParams.get("q")?.trim();
    if (q && !q.startsWith("http") && !/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(q)) {
      return q;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function resolveGoogleMapsOpenUrl(mapsUrl?: string | null, venue?: string): string | null {
  const trimmed = mapsUrl?.trim();
  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.hostname.includes("google") ||
        parsed.hostname.includes("goo.gl") ||
        parsed.hostname.includes("maps.app")
      ) {
        return trimmed;
      }
    } catch {
      /* fall through */
    }
  }
  if (venue?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.trim())}`;
  }
  return null;
}

export function buildGoogleMapsUrlFromCoords(
  latitude: number,
  longitude: number,
): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function buildGoogleMapsEmbedUrl(mapsUrl?: string | null, venue?: string): string | null {
  const trimmed = mapsUrl?.trim();

  if (trimmed) {
    const coords = extractCoordsFromUrl(trimmed);
    if (coords) {
      return `https://maps.google.com/maps?q=${coords}&z=16&output=embed`;
    }

    const place = extractPlaceNameFromUrl(trimmed);
    if (place) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=16&output=embed`;
    }

    if (!trimmed.startsWith("http")) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=16&output=embed`;
    }
  }

  if (venue?.trim()) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(venue.trim())}&z=16&output=embed`;
  }

  return null;
}
