import "server-only";

import { AppError } from "@/lib/errors";
import {
  GOOGLE_AUTOCOMPLETE_MIN_CHARS,
  googleAutocompletePlaces,
  googleGetPlaceDetails,
  isGooglePlaceId,
  isGooglePlacesCircuitOpen,
  isGooglePlacesConfigured,
  toGoogleRawPlaceId,
} from "@/lib/maps/google-places.server";
import { buildVenueOpenUrl } from "@/lib/maps/venue-maps-url";
import {
  getCachedAutocomplete,
  setCachedAutocomplete,
} from "@/lib/maps/venue-search-cache";
import type {
  PlaceDetails,
  PlacePrediction,
  VenueAutocompleteResult,
  VenueSearchProvider,
} from "@/lib/maps/venue-search-types";

export type { PlaceDetails, PlacePrediction, VenueAutocompleteResult, VenueSearchProvider };

/** Venue search works when Google and/or OpenStreetMap is available. */
export function isVenueSearchConfigured(): boolean {
  return true;
}

/** Indonesia bounding box for search bias (west,south,east,north). */
const ID_BBOX = "95,-11,141,6";

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  "Gud Game/1.0 (venue search; contact: support@gudgame.app)";

type PhotonFeature = {
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: Record<string, string | undefined>;
};

function buildOsmPlaceId(osmType: string, osmId: number | string): string {
  return `osm:${osmType}:${osmId}`;
}

function parseOsmPlaceId(placeId: string): { osmType: string; osmId: string } | null {
  const match = /^osm:([NWR]):(\d+)$/i.exec(placeId.trim());
  if (!match) return null;
  return { osmType: match[1]!.toUpperCase(), osmId: match[2]! };
}

function buildSecondaryLine(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

function mapPhotonFeature(feature: PhotonFeature): PlacePrediction | null {
  const props = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!props?.osm_type || props.osm_id == null || !coords || coords.length < 2) return null;

  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const mainText = props.name?.trim() || "Selected location";
  const secondaryText = buildSecondaryLine([
    props.street,
    props.district,
    props.city,
    props.state,
    props.country,
  ]);
  const description = secondaryText ? `${mainText}, ${secondaryText}` : mainText;

  return {
    placeId: buildOsmPlaceId(props.osm_type, props.osm_id),
    description,
    mainText,
    secondaryText,
    latitude,
    longitude,
  };
}

function mapNominatimResult(result: NominatimResult): PlacePrediction | null {
  if (!result.osm_type || result.osm_id == null) return null;

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const mainText =
    result.name?.trim() ||
    result.address?.amenity ||
    result.address?.building ||
    result.address?.road ||
    result.display_name?.split(",")[0]?.trim() ||
    "Selected location";

  const description = result.display_name ?? mainText;
  const secondaryText = description.startsWith(mainText)
    ? description.slice(mainText.length).replace(/^,\s*/, "")
    : description;

  return {
    placeId: buildOsmPlaceId(result.osm_type[0]!.toUpperCase(), result.osm_id),
    description,
    mainText,
    secondaryText,
    latitude,
    longitude,
  };
}

function dedupePredictions(items: PlacePrediction[]): PlacePrediction[] {
  const seen = new Set<string>();
  const out: PlacePrediction[] = [];
  for (const item of items) {
    if (seen.has(item.placeId)) continue;
    seen.add(item.placeId);
    out.push(item);
  }
  return out;
}

async function searchPhoton(query: string): Promise<PlacePrediction[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", ID_BBOX);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return [];

  const json = (await res.json()) as { features?: PhotonFeature[] };
  return (json.features ?? [])
    .map(mapPhotonFeature)
    .filter((p): p is PlacePrediction => Boolean(p));
}

async function searchNominatim(query: string): Promise<PlacePrediction[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "id");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];

  const json = (await res.json()) as NominatimResult[];
  return json
    .map(mapNominatimResult)
    .filter((p): p is PlacePrediction => Boolean(p));
}

async function osmAutocompletePlaces(input: string): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const cached = getCachedAutocomplete("osm", trimmed);
  if (cached) return cached;

  const photonResults = await searchPhoton(trimmed);
  const items =
    photonResults.length > 0
      ? dedupePredictions(photonResults).slice(0, 8)
      : dedupePredictions(await searchNominatim(trimmed)).slice(0, 8);

  if (items.length > 0) {
    setCachedAutocomplete("osm", trimmed, items);
  }
  return items;
}

/**
 * Hybrid venue autocomplete: Google Places (New) first, OpenStreetMap fallback.
 * Google is skipped when the circuit is open (quota/auth errors) or query is too short.
 */
export async function autocompletePlaces(input: string): Promise<VenueAutocompleteResult> {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return { items: [], provider: "osm" };
  }

  const canUseGoogle =
    isGooglePlacesConfigured() &&
    !isGooglePlacesCircuitOpen() &&
    trimmed.length >= GOOGLE_AUTOCOMPLETE_MIN_CHARS;

  if (canUseGoogle) {
    const cached = getCachedAutocomplete("google", trimmed);
    if (cached?.length) {
      return { items: cached, provider: "google" };
    }

    try {
      const googleItems = await googleAutocompletePlaces(trimmed);
      if (googleItems.length > 0) {
        setCachedAutocomplete("google", trimmed, googleItems);
        return { items: googleItems, provider: "google" };
      }
    } catch {
      /* Fall through to OpenStreetMap */
    }
  }

  const osmItems = await osmAutocompletePlaces(trimmed);
  return { items: osmItems, provider: "osm" };
}

async function osmGetPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const parsed = parseOsmPlaceId(placeId);
  if (!parsed) {
    throw new AppError("Invalid place id", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.searchParams.set("osm_ids", `${parsed.osmType}${parsed.osmId}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new AppError("Place lookup failed", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const json = (await res.json()) as NominatimResult[];
  const mapped = json.map(mapNominatimResult).find(Boolean);
  if (!mapped) {
    throw new AppError("Place not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const name = mapped.mainText || mapped.description;
  return {
    placeId: mapped.placeId,
    name,
    formattedAddress: mapped.description,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    mapsUrl: buildVenueOpenUrl(mapped.latitude, mapped.longitude, name),
  };
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const trimmed = placeId.trim();
  if (!trimmed) {
    throw new AppError("Place id is required", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  if (isGooglePlaceId(trimmed)) {
    return googleGetPlaceDetails(trimmed);
  }

  if (parseOsmPlaceId(trimmed)) {
    return osmGetPlaceDetails(trimmed);
  }

  // Legacy Google place ids saved without prefix
  if (/^ChI[A-Za-z0-9_-]+$/.test(trimmed) && isGooglePlacesConfigured()) {
    return googleGetPlaceDetails(toGoogleRawPlaceId(trimmed));
  }

  throw new AppError("Invalid place id", { code: "VALIDATION_ERROR", statusCode: 400 });
}
