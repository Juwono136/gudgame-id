"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildGoogleMapsEmbedUrl,
  resolveGoogleMapsOpenUrl,
} from "@/lib/maps/google-maps-url";

type VenueMapsFieldProps = {
  venue: string;
  mapsUrl: string;
  onVenueChange: (value: string) => void;
  onMapsUrlChange: (value: string) => void;
};

export function VenueMapsField({
  venue,
  mapsUrl,
  onVenueChange,
  onMapsUrlChange,
}: VenueMapsFieldProps) {
  const embedUrl = buildGoogleMapsEmbedUrl(mapsUrl, venue);
  const openUrl = resolveGoogleMapsOpenUrl(mapsUrl, venue);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Venue name</Label>
          <Input
            value={venue}
            onChange={(e) => onVenueChange(e.target.value)}
            placeholder="Jakarta Padel Venue"
            className="mt-1.5 border-cp-border bg-cp-bg-input"
          />
        </div>
        <div>
          <Label>Google Maps link</Label>
          <Input
            value={mapsUrl}
            onChange={(e) => onMapsUrlChange(e.target.value)}
            placeholder="https://maps.google.com/…"
            type="url"
            className="mt-1.5 border-cp-border bg-cp-bg-input"
          />
        </div>
      </div>

      {embedUrl ? (
        <div className="overflow-hidden rounded-xl border border-cp-border">
          <div className="flex items-center justify-between border-b border-cp-border bg-cp-elevated/50 px-3 py-2 text-xs text-cp-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              Location preview
            </span>
            {openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cp-primary hover:underline"
              >
                Open in Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          <iframe
            title="Venue map preview"
            src={embedUrl}
            className="h-48 w-full border-0 sm:h-56"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
    </div>
  );
}
