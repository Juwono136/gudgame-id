"use client";

import { ExternalLink, MapPin } from "lucide-react";
import {
  buildVenueEmbedUrl,
  resolveVenueOpenUrl,
} from "@/lib/maps/venue-maps-url";
import { cn } from "@/lib/utils";

type TournamentVenueMapPreviewProps = {
  venue: string;
  mapsUrl?: string;
  className?: string;
  compact?: boolean;
};

export function TournamentVenueMapPreview({
  venue,
  mapsUrl = "",
  className,
  compact = false,
}: TournamentVenueMapPreviewProps) {
  const embedUrl = buildVenueEmbedUrl(mapsUrl, venue);
  const openUrl = resolveVenueOpenUrl(mapsUrl, venue);

  if (!venue.trim() && !embedUrl) return null;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-cp-border bg-cp-card", className)}>
      <div className="flex flex-col gap-3 border-b border-cp-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-cp-muted">Venue</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{venue.trim() || "Location"}</p>
          </div>
        </div>
        {openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-3 py-1.5 text-xs font-medium text-cp-primary transition-colors hover:bg-cp-primary/10"
          >
            Open in Maps
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      {embedUrl ? (
        <iframe
          title={`Map preview for ${venue || "venue"}`}
          src={embedUrl}
          className={cn(
            "w-full border-0 bg-cp-elevated",
            compact ? "h-40 sm:h-48" : "h-48 sm:h-56 md:h-64",
          )}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="flex h-32 items-center justify-center bg-cp-elevated/50 px-4 text-center text-sm text-cp-muted">
          Map preview unavailable for this venue.
        </div>
      )}
    </div>
  );
}
