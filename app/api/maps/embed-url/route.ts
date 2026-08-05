import { z } from "zod";
import { guardApiRequest } from "@/lib/api/guard-request";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  buildGoogleMapsEmbedUrlWithApiKey,
  isGoogleMapsEmbedApiEnabled,
} from "@/lib/maps/embed-url.server";
import { expandGoogleMapsUrl } from "@/lib/maps/expand-google-maps-url.server";
import {
  buildGoogleMapsEmbedUrl,
  isGoogleMapsHttpsUrl,
  resolveGoogleMapsLocationLabel,
} from "@/lib/maps/google-maps-url";
import { buildVenueEmbedUrl } from "@/lib/maps/venue-maps-url";

export const runtime = "nodejs";

const querySchema = z
  .object({
    venue: z.string().trim().max(200).optional().default(""),
    mapsUrl: z.string().trim().max(2048).optional(),
    /** When true, never use `venue` for embed/label — Maps URL only (Contact Us). */
    mapsOnly: z
      .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
      .optional()
      .transform((value) => value === "1" || value === "true"),
  })
  .refine((value) => Boolean(value.venue || value.mapsUrl), {
    message: "venue or mapsUrl is required",
  });

/**
 * Resolve an iframe-safe embed URL for venue / contact map preview.
 *
 * Google Maps short links are expanded server-side so the pin matches the
 * shared URL. Google URLs never fall back to OpenStreetMap.
 */
export async function GET(request: Request) {
  try {
    await guardApiRequest(request, { tier: "maps" });

    const url = new URL(request.url);
    const { venue, mapsUrl, mapsOnly } = querySchema.parse({
      venue: url.searchParams.get("venue") ?? "",
      mapsUrl: url.searchParams.get("mapsUrl") ?? undefined,
      mapsOnly: url.searchParams.get("mapsOnly") ?? undefined,
    });

    const resolvedMapsUrl = mapsUrl ? await expandGoogleMapsUrl(mapsUrl) : undefined;
    const googleMapsLink = Boolean(resolvedMapsUrl && isGoogleMapsHttpsUrl(resolvedMapsUrl));
    const embedApiEnabled = isGoogleMapsEmbedApiEnabled();
    // Contact Us: pin + caption must follow Maps URL only — ignore registered address.
    const venueForEmbed = mapsOnly ? "" : venue;

    const googleEmbed =
      (embedApiEnabled
        ? buildGoogleMapsEmbedUrlWithApiKey(resolvedMapsUrl, venueForEmbed)
        : null) ?? buildGoogleMapsEmbedUrl(resolvedMapsUrl, venueForEmbed);

    // Preserve OSM fallback for non-Google venue links (tournaments), never for Google URLs.
    const embedUrl =
      googleEmbed ??
      (googleMapsLink || mapsOnly ? null : buildVenueEmbedUrl(resolvedMapsUrl, venueForEmbed));

    const locationLabel =
      resolveGoogleMapsLocationLabel(resolvedMapsUrl) ||
      resolveGoogleMapsLocationLabel(mapsUrl) ||
      (mapsOnly ? null : venueForEmbed || null);

    return jsonSuccess({
      embedUrl,
      openUrl: resolvedMapsUrl || mapsUrl || null,
      locationLabel,
      embedApiEnabled,
      provider: embedUrl?.includes("openstreetmap.org")
        ? "openstreetmap"
        : embedUrl
          ? "google"
          : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
