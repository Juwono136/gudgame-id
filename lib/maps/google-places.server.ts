import "server-only";

import { AppError } from "@/lib/errors";
import { buildGoogleMapsUrlFromCoords } from "@/lib/maps/google-maps-url";
import type { PlaceDetails, PlacePrediction } from "@/lib/maps/venue-search-types";
import { VENUE_AUTOCOMPLETE_MIN_CHARS } from "@/lib/maps/venue-search-types";

export const GOOGLE_PLACE_ID_PREFIX = "g:";

const PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const PLACES_BASE_URL = "https://places.googleapis.com/v1/places";

/** Minimum characters before calling Google (reduces daily quota usage). */
export const GOOGLE_AUTOCOMPLETE_MIN_CHARS = VENUE_AUTOCOMPLETE_MIN_CHARS;

type GooglePlacesErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

type GooglePlaceResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

let googleCircuitOpenUntil = 0;

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

export function isGooglePlacesCircuitOpen(): boolean {
  return Date.now() < googleCircuitOpenUntil;
}

export function tripGooglePlacesCircuit(durationMs = 15 * 60 * 1000): void {
  googleCircuitOpenUntil = Date.now() + durationMs;
}

export function isGooglePlaceId(placeId: string): boolean {
  return placeId.startsWith(GOOGLE_PLACE_ID_PREFIX);
}

export function toGoogleRawPlaceId(placeId: string): string {
  return placeId.startsWith(GOOGLE_PLACE_ID_PREFIX)
    ? placeId.slice(GOOGLE_PLACE_ID_PREFIX.length)
    : placeId;
}

export function buildGooglePlaceId(rawPlaceId: string): string {
  return `${GOOGLE_PLACE_ID_PREFIX}${rawPlaceId}`;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new AppError("Google Maps API key is not configured", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }
  return key;
}

function isGoogleQuotaOrAuthError(status: number, body?: GooglePlacesErrorBody): boolean {
  const googleStatus = body?.error?.status;
  if (status === 429 || status === 403) return true;
  if (
    googleStatus === "RESOURCE_EXHAUSTED" ||
    googleStatus === "PERMISSION_DENIED" ||
    googleStatus === "UNAUTHENTICATED"
  ) {
    return true;
  }
  return false;
}

async function parseGoogleError(res: Response): Promise<GooglePlacesErrorBody> {
  try {
    return (await res.json()) as GooglePlacesErrorBody;
  } catch {
    return {};
  }
}

function mapGoogleSuggestion(
  suggestion: NonNullable<GoogleAutocompleteResponse["suggestions"]>[number],
): PlacePrediction | null {
  const prediction = suggestion.placePrediction;
  const rawId = prediction?.placeId?.trim();
  if (!rawId) return null;

  const mainText =
    prediction?.structuredFormat?.mainText?.text?.trim() ||
    prediction?.text?.text?.trim() ||
    "Selected location";
  const secondaryText = prediction?.structuredFormat?.secondaryText?.text?.trim() ?? "";
  const description = secondaryText ? `${mainText}, ${secondaryText}` : mainText;

  return {
    placeId: buildGooglePlaceId(rawId),
    description,
    mainText,
    secondaryText,
    latitude: 0,
    longitude: 0,
  };
}

export async function googleAutocompletePlaces(input: string): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < GOOGLE_AUTOCOMPLETE_MIN_CHARS) return [];

  const apiKey = getApiKey();
  const res = await fetch(PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input: trimmed,
      includedRegionCodes: ["id"],
      languageCode: "en",
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await parseGoogleError(res);
    if (isGoogleQuotaOrAuthError(res.status, body)) {
      tripGooglePlacesCircuit();
    }
    throw new AppError(body.error?.message ?? "Google Places autocomplete failed", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: res.status === 429 ? 429 : 503,
    });
  }

  const json = (await res.json()) as GoogleAutocompleteResponse;
  return (json.suggestions ?? [])
    .map(mapGoogleSuggestion)
    .filter((p): p is PlacePrediction => Boolean(p))
    .slice(0, 8);
}

export async function googleGetPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const rawId = toGoogleRawPlaceId(placeId);
  if (!rawId) {
    throw new AppError("Invalid Google place id", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const url = `${PLACES_BASE_URL}/${encodeURIComponent(rawId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await parseGoogleError(res);
    if (isGoogleQuotaOrAuthError(res.status, body)) {
      tripGooglePlacesCircuit();
    }
    throw new AppError(body.error?.message ?? "Google place lookup failed", {
      code: res.status === 404 ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
      statusCode: res.status === 404 ? 404 : 503,
    });
  }

  const json = (await res.json()) as GooglePlaceResponse;
  const latitude = json.location?.latitude;
  const longitude = json.location?.longitude;
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError("Place coordinates unavailable", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const name = json.displayName?.text?.trim() || "Selected location";
  const formattedAddress = json.formattedAddress?.trim() || name;

  return {
    placeId: buildGooglePlaceId(json.id ?? rawId),
    name,
    formattedAddress,
    latitude,
    longitude,
    mapsUrl: buildGoogleMapsUrlFromCoords(latitude, longitude),
  };
}
