import "server-only";

import {
  resolveMapsEmbedTarget,
  type MapsEmbedTarget,
} from "@/lib/maps/google-maps-url";

function buildEmbedApiUrl(target: MapsEmbedTarget, apiKey: string): string {
  const key = encodeURIComponent(apiKey);

  if (target.kind === "coords") {
    const center = `${target.latitude},${target.longitude}`;
    return `https://www.google.com/maps/embed/v1/view?key=${key}&center=${encodeURIComponent(center)}&zoom=16`;
  }

  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(target.query)}`;
}

export function isGoogleMapsEmbedApiEnabled(): boolean {
  return process.env.GOOGLE_MAPS_EMBED_API_ENABLED === "true";
}

/**
 * Maps Embed API v1 URL — separate product from Places API (New).
 * Only used when GOOGLE_MAPS_EMBED_API_ENABLED=true in Google Cloud Console.
 */
export function buildGoogleMapsEmbedUrlWithApiKey(
  mapsUrl?: string | null,
  venue?: string,
): string | null {
  if (!isGoogleMapsEmbedApiEnabled()) return null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const target = resolveMapsEmbedTarget(mapsUrl, venue);
  if (!target || !apiKey) return null;

  return buildEmbedApiUrl(target, apiKey);
}
