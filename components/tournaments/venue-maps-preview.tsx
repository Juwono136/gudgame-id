"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildGoogleMapsEmbedUrl,
  resolveGoogleMapsOpenUrl,
} from "@/lib/maps/google-maps-url";

type VenueMapsPreviewProps = {
  venue: string;
  mapsUrl?: string | null;
  className?: string;
};

export function VenueMapsPreview({ venue, mapsUrl, className }: VenueMapsPreviewProps) {
  const openUrl = resolveGoogleMapsOpenUrl(mapsUrl, venue);
  const embedUrl = buildGoogleMapsEmbedUrl(mapsUrl, venue);

  return (
    <section className={className}>
      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        <div className="flex items-center justify-between gap-2 border-b border-cp-border bg-cp-elevated/50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 text-cp-primary" />
            {venue}
          </span>
          {openUrl ? (
            <Button asChild variant="link" className="h-auto shrink-0 p-0 text-cp-primary">
              <a href={openUrl} target="_blank" rel="noopener noreferrer">
                Open in Maps
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
        {embedUrl ? (
          <iframe
            title={`Map of ${venue}`}
            src={embedUrl}
            className="h-52 w-full border-0 sm:h-64"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <p className="px-4 py-6 text-sm text-cp-muted">
            Add a Google Maps link to show an interactive location preview.
          </p>
        )}
      </div>
    </section>
  );
}
