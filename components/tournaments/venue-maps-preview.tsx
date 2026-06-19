"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildGoogleMapsEmbedUrl,
  resolveGoogleMapsOpenUrl,
} from "@/lib/maps/google-maps-url";
import { cn } from "@/lib/utils";

type VenueMapsPreviewProps = {
  venue: string;
  mapsUrl?: string | null;
  className?: string;
};

export function VenueMapsPreview({ venue, mapsUrl, className }: VenueMapsPreviewProps) {
  const openUrl = resolveGoogleMapsOpenUrl(mapsUrl, venue);
  const embedUrl = buildGoogleMapsEmbedUrl(mapsUrl, venue);

  return (
    <section className={cn("min-w-0", className)} aria-labelledby="venue-location-heading">
      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        <div className="border-b border-cp-border bg-cp-elevated/40 px-4 py-4 sm:px-5">
          <h2
            id="venue-location-heading"
            className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg"
          >
            <MapPin className="h-5 w-5 shrink-0 text-cp-primary" aria-hidden />
            Location
          </h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-cp-muted">
              {venue}
            </p>
            {openUrl ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 w-full shrink-0 border-cp-border sm:w-auto"
              >
                <a href={openUrl} target="_blank" rel="noopener noreferrer">
                  Open in Maps
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        {embedUrl ? (
          <div className="relative h-40 w-full bg-cp-elevated/30 sm:h-44 lg:h-48">
            <iframe
              title={`Map of ${venue}`}
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-cp-muted sm:px-5">
            Add a Google Maps link to show an interactive location preview.
          </p>
        )}
      </div>
    </section>
  );
}
