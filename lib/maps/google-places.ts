import "server-only";

import { AppError } from "@/lib/errors";

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
};

const PLACES_BASE = "https://places.googleapis.com/v1";

function getApiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
}

/** App origin for Google API key HTTP-referrer restrictions (server-side calls send no browser Referer). */
function getPlacesReferer(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3000";
  try {
    return new URL(raw).origin + "/";
  } catch {
    return "http://localhost:3000/";
  }
}

function placesAuthHeaders(): Record<string, string> {
  const key = getApiKey();
  if (!key) return {};
  return {
    "X-Goog-Api-Key": key,
    Referer: getPlacesReferer(),
  };
}

function friendlyPlacesError(message: string): string {
  if (/referer.*blocked/i.test(message) || /referer <empty>/i.test(message)) {
    return (
      "Google Maps API key is blocked for server requests. In Google Cloud Console → Credentials → your API key, " +
      "set Application restrictions to “None” (dev) or “IP addresses”, OR add your app URL to HTTP referrers " +
      `(e.g. ${getPlacesReferer()}*).`
    );
  }
  return message;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getApiKey());
}

function normalizePlaceId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("places/")) {
    return trimmed.slice("places/".length);
  }
  return trimmed;
}

async function parsePlacesError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as {
      error?: { message?: string; status?: string };
    };
    const raw = json.error?.message ?? `Places API error (${res.status})`;
    return friendlyPlacesError(raw);
  } catch {
    return `Places API error (${res.status})`;
  }
}

export async function autocompletePlaces(input: string): Promise<PlacePrediction[]> {
  const key = getApiKey();
  if (!key) {
    throw new AppError("Google Maps API key is not configured", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...placesAuthHeaders(),
    },
    body: JSON.stringify({
      input: trimmed,
      includedPrimaryTypes: ["establishment", "geocode"],
      languageCode: "en",
      includedRegionCodes: ["id"],
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const message = await parsePlacesError(res);
    throw new AppError(message, {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const json = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        place?: string;
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => {
      const placeId =
        p.placeId ??
        (p.place?.startsWith("places/") ? p.place.slice("places/".length) : p.place) ??
        "";
      const description = p.text?.text ?? "";
      return {
        placeId,
        description,
        mainText: p.structuredFormat?.mainText?.text ?? description,
        secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      };
    })
    .filter((p) => p.placeId.length > 0);
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const key = getApiKey();
  if (!key) {
    throw new AppError("Google Maps API key is not configured", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const id = normalizePlaceId(placeId);
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      ...placesAuthHeaders(),
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,googleMapsUri",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const message = await parsePlacesError(res);
    throw new AppError(message, {
      code: res.status === 404 ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
      statusCode: res.status === 404 ? 404 : 503,
    });
  }

  const json = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    googleMapsUri?: string;
  };

  const lat = json.location?.latitude;
  const lng = json.location?.longitude;

  if (lat == null || lng == null) {
    throw new AppError("Place coordinates not found", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  const name = json.displayName?.text ?? json.formattedAddress ?? "Selected venue";
  const mapsUrl =
    json.googleMapsUri?.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return {
    placeId: normalizePlaceId(json.id ?? id),
    name,
    formattedAddress: json.formattedAddress ?? name,
    latitude: lat,
    longitude: lng,
    mapsUrl,
  };
}
