import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  buildGoogleMapsEmbedUrlWithApiKey,
  isGoogleMapsEmbedApiEnabled,
} from "@/lib/maps/embed-url.server";
import { buildGoogleMapsEmbedUrl } from "@/lib/maps/google-maps-url";
import { buildVenueEmbedUrl } from "@/lib/maps/venue-maps-url";

export const runtime = "nodejs";

const querySchema = z.object({
  venue: z.string().trim().min(1).max(200),
  mapsUrl: z.string().trim().max(2048).optional(),
});

/**
 * Resolve an iframe-safe embed URL for venue preview.
 *
 * Places API (New) is enough for autocomplete. Preview prefers the keyless
 * Google embed (`output=embed`) so Maps Embed API does not need to be enabled.
 * Set GOOGLE_MAPS_EMBED_API_ENABLED=true only after enabling Maps Embed API in GCP.
 */
export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "maps" });

    const url = new URL(request.url);
    const { venue, mapsUrl } = querySchema.parse({
      venue: url.searchParams.get("venue") ?? "",
      mapsUrl: url.searchParams.get("mapsUrl") ?? undefined,
    });

    const embedApiEnabled = isGoogleMapsEmbedApiEnabled();

    // Prefer keyless Google embed — works with Places-only projects.
    // Keyed Maps Embed API v1 is opt-in (requires that API enabled in GCP).
    const embedUrl = embedApiEnabled
      ? buildGoogleMapsEmbedUrlWithApiKey(mapsUrl, venue) ??
        buildGoogleMapsEmbedUrl(mapsUrl, venue) ??
        buildVenueEmbedUrl(mapsUrl, venue)
      : buildGoogleMapsEmbedUrl(mapsUrl, venue) ??
        buildVenueEmbedUrl(mapsUrl, venue);

    return jsonSuccess({
      embedUrl,
      embedApiEnabled,
    });
  } catch (error) {
    return jsonError(error);
  }
}
