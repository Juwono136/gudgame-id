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
    for (const key of ["q", "query", "ll", "center"] as const) {
      const value = parsed.searchParams.get(key)?.trim();
      if (value && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(value)) {
        return value;
      }
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
    for (const key of ["q", "query"] as const) {
      const value = parsed.searchParams.get(key)?.trim();
      if (
        value &&
        !value.startsWith("http") &&
        !/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(value)
      ) {
        return value;
      }
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

export type MapsEmbedTarget =
  | { kind: "coords"; latitude: number; longitude: number }
  | { kind: "place"; query: string };

/** Resolve venue / maps link into an embed target (coords or place search). */
function extractOsmCoordsFromUrl(url: string): { latitude: number; longitude: number } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("openstreetmap.org")) return null;

    const mlat = parsed.searchParams.get("mlat");
    const mlon = parsed.searchParams.get("mlon");
    if (mlat && mlon) {
      const latitude = Number(mlat);
      const longitude = Number(mlon);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }

    const hashMatch = parsed.hash.match(/#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
    if (hashMatch) {
      const latitude = Number(hashMatch[1]);
      const longitude = Number(hashMatch[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch {
    /* ignore invalid URLs */
  }
  return null;
}

export function resolveMapsEmbedTarget(
  mapsUrl?: string | null,
  venue?: string,
): MapsEmbedTarget | null {
  const trimmed = mapsUrl?.trim();

  if (trimmed) {
    const osmCoords = extractOsmCoordsFromUrl(trimmed);
    if (osmCoords) {
      return { kind: "coords", latitude: osmCoords.latitude, longitude: osmCoords.longitude };
    }

    const coords = extractCoordsFromUrl(trimmed);
    if (coords) {
      const [lat, lng] = coords.split(",").map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { kind: "coords", latitude: lat, longitude: lng };
      }
    }

    const place = extractPlaceNameFromUrl(trimmed);
    if (place) return { kind: "place", query: place };

    if (!trimmed.startsWith("http")) {
      return { kind: "place", query: trimmed };
    }
  }

  if (venue?.trim()) {
    return { kind: "place", query: venue.trim() };
  }

  return null;
}

/** Legacy embed URL (no API key). Prefer Maps Embed API via `/api/maps/embed-url`. */
export function buildGoogleMapsEmbedUrl(mapsUrl?: string | null, venue?: string): string | null {
  const target = resolveMapsEmbedTarget(mapsUrl, venue);
  if (!target) return null;

  if (target.kind === "coords") {
    return `https://maps.google.com/maps?q=${target.latitude},${target.longitude}&z=16&output=embed`;
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(target.query)}&z=16&output=embed`;
}
