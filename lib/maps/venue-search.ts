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

/** Venue autocomplete requires a configured Google Maps Places API key. */
export function isVenueSearchConfigured(): boolean {
  return isGooglePlacesConfigured();
}

/**
 * Google Places (New) autocomplete only — no OpenStreetMap / Nominatim fallback.
 * Errors from Google (quota, auth, network) are surfaced to the client.
 */
export async function autocompletePlaces(input: string): Promise<VenueAutocompleteResult> {
  const trimmed = input.trim();
  if (trimmed.length < GOOGLE_AUTOCOMPLETE_MIN_CHARS) {
    return { items: [], provider: "google" };
  }

  if (!isGooglePlacesConfigured()) {
    return { items: [], provider: "google" };
  }

  if (isGooglePlacesCircuitOpen()) {
    throw new AppError(
      "Google Maps is temporarily unavailable due to rate limits. Please try again shortly.",
      { code: "SERVICE_UNAVAILABLE", statusCode: 503 },
    );
  }

  const cached = getCachedAutocomplete("google", trimmed);
  if (cached) {
    return { items: cached, provider: "google" };
  }

  const googleItems = await googleAutocompletePlaces(trimmed);
  if (googleItems.length > 0) {
    setCachedAutocomplete("google", trimmed, googleItems);
  }
  return { items: googleItems, provider: "google" };
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const trimmed = placeId.trim();
  if (!trimmed) {
    throw new AppError("Place id is required", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  if (!isGooglePlacesConfigured()) {
    throw new AppError("Google Maps is not configured", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  if (isGooglePlaceId(trimmed)) {
    return googleGetPlaceDetails(trimmed);
  }

  // Legacy Google place ids saved without the g: prefix
  if (/^ChI[A-Za-z0-9_-]+$/.test(trimmed)) {
    return googleGetPlaceDetails(toGoogleRawPlaceId(trimmed));
  }

  throw new AppError("Invalid Google place id", {
    code: "VALIDATION_ERROR",
    statusCode: 400,
  });
}
