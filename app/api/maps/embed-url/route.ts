import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildGoogleMapsEmbedUrlWithApiKey } from "@/lib/maps/embed-url.server";
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

    // Legacy embed works with Places API (New) only — no Maps Embed API required.
    const embedUrl =
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
