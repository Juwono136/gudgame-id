import { buildGoogleMapsEmbedUrl, resolveMapsEmbedTarget } from "@/lib/maps/google-maps-url";

/** Open in OpenStreetMap (free, no API key). */
export function buildVenueOpenUrl(
  latitude: number,
  longitude: number,
  _name?: string,
): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

/** Map embed: Google legacy iframe when URL is Google; OSM for OpenStreetMap coords. */
export function buildVenueEmbedUrl(
  mapsUrl?: string | null,
  venue?: string,
): string | null {
  const trimmed = mapsUrl?.trim();
  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.hostname.includes("google") ||
        parsed.hostname.includes("goo.gl") ||
        parsed.hostname.includes("maps.app")
      ) {
        return buildGoogleMapsEmbedUrl(mapsUrl, venue);
      }
    } catch {
      /* fall through */
    }
  }

  const target = resolveMapsEmbedTarget(mapsUrl, venue);
  if (!target) return null;

  if (target.kind === "coords") {
    const { latitude, longitude } = target;
    const pad = 0.012;
    const bbox = [
      longitude - pad,
      latitude - pad,
      longitude + pad,
      latitude + pad,
    ].join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }

  return buildGoogleMapsEmbedUrl(mapsUrl, venue);
}

/** Prefer Google Maps links when stored; OSM for legacy records. */
export function resolveVenueOpenUrl(mapsUrl?: string | null, venue?: string): string | null {
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
      if (parsed.hostname.includes("openstreetmap.org")) {
        return trimmed;
      }
    } catch {
      /* fall through */
    }
  }

  const target = resolveMapsEmbedTarget(mapsUrl, venue);
  if (target?.kind === "coords") {
    return buildVenueOpenUrl(target.latitude, target.longitude, venue ?? undefined);
  }

  if (venue?.trim()) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(venue.trim())}`;
  }

  return null;
}

export function buildVenueMapsUrlFromCoords(latitude: number, longitude: number): string {
  return buildVenueOpenUrl(latitude, longitude);
}
