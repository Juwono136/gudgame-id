"use client";

import { ExternalLink, MapPin } from "lucide-react";
import {
  buildGoogleMapsUrlFromCoords,
  resolveGoogleMapsOpenUrl,
  resolveMapsEmbedTarget,
} from "@/lib/maps/google-maps-url";
import { cn } from "@/lib/utils";

type TournamentHeroVenueLinkProps = {
  venue: string;
  mapsUrl?: string | null;
  className?: string;
  iconClassName?: string;
};

function resolveHeroMapsUrl(mapsUrl?: string | null, venue?: string): string | null {
  const google = resolveGoogleMapsOpenUrl(mapsUrl, venue);
  if (google) return google;

  const target = resolveMapsEmbedTarget(mapsUrl, venue);
  if (target?.kind === "coords") {
    return buildGoogleMapsUrlFromCoords(target.latitude, target.longitude);
  }

  return resolveGoogleMapsOpenUrl(null, venue);
}

/** Hero venue label that opens Google Maps (app or web) in a new tab. */
export function TournamentHeroVenueLink({
  venue,
  mapsUrl,
  className,
  iconClassName,
}: TournamentHeroVenueLinkProps) {
  const trimmed = venue.trim();
  if (!trimmed) return null;

  const href = resolveHeroMapsUrl(mapsUrl, trimmed);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <MapPin className={cn("h-4 w-4 shrink-0", iconClassName)} />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 break-words underline-offset-2 transition-colors hover:underline"
          title="Open venue in Google Maps"
        >
          <span className="min-w-0 break-words">{trimmed}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="sr-only">(opens Google Maps)</span>
        </a>
      ) : (
        <span className="break-words">{trimmed}</span>
      )}
    </span>
  );
}
