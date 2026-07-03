import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildGoogleMapsEmbedUrlWithApiKey } from "@/lib/maps/embed-url.server";
import { buildVenueEmbedUrl } from "@/lib/maps/venue-maps-url";
import { buildGoogleMapsEmbedUrl } from "@/lib/maps/google-maps-url";

export const runtime = "nodejs";

const querySchema = z.object({
  venue: z.string().trim().min(1).max(200),
  mapsUrl: z.string().trim().max(2048).optional(),
});

export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "maps" });

    const url = new URL(request.url);
    const { venue, mapsUrl } = querySchema.parse({
      venue: url.searchParams.get("venue") ?? "",
      mapsUrl: url.searchParams.get("mapsUrl") ?? undefined,
    });

    const trimmed = mapsUrl?.trim();
    const isGoogleUrl =
      trimmed &&
      (() => {
        try {
          const host = new URL(trimmed).hostname;
          return host.includes("google") || host.includes("goo.gl") || host.includes("maps.app");
        } catch {
          return false;
        }
      })();

    const embedUrl = isGoogleUrl
      ? buildGoogleMapsEmbedUrlWithApiKey(mapsUrl, venue) ??
        buildGoogleMapsEmbedUrl(mapsUrl, venue) ??
        buildVenueEmbedUrl(mapsUrl, venue)
      : buildVenueEmbedUrl(mapsUrl, venue) ??
        buildGoogleMapsEmbedUrl(mapsUrl, venue) ??
        buildGoogleMapsEmbedUrlWithApiKey(mapsUrl, venue);

    return jsonSuccess({
      embedUrl,
      embedApiEnabled: process.env.GOOGLE_MAPS_EMBED_API_ENABLED === "true",
    });
  } catch (error) {
    return jsonError(error);
  }
}
