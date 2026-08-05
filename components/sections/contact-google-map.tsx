"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  isGoogleMapsEmbedUrl,
  isGoogleMapsHttpsUrl,
  resolveGoogleMapsOpenUrl,
} from "@/lib/maps/google-maps-url";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

type ContactGoogleMapProps = {
  mapsUrl: string;
  title: string;
  openLabel: string;
  className?: string;
};

type EmbedApiData = {
  success: boolean;
  data?: {
    embedUrl: string | null;
    openUrl?: string | null;
    locationLabel?: string | null;
    provider?: "google" | "openstreetmap" | null;
  };
};

export function ContactGoogleMap({
  mapsUrl,
  title,
  openLabel,
  className,
}: ContactGoogleMapProps) {
  const trimmedMapsUrl = mapsUrl.trim();
  const canResolve = isGoogleMapsHttpsUrl(trimmedMapsUrl);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maps", "contact-embed", trimmedMapsUrl],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        mapsUrl: trimmedMapsUrl,
        mapsOnly: "1",
      });

      const res = await fetch(`/api/maps/embed-url?${params}`, { signal });
      const json = await parseJsonResponse<EmbedApiData>(res);
      if (!res.ok) {
        throw new Error("Could not resolve Google Maps preview");
      }

      const embedUrl = json.data?.embedUrl?.trim() || null;
      // Contact page is Google-only — reject OSM / unknown providers.
      if (!embedUrl || !isGoogleMapsEmbedUrl(embedUrl)) {
        return {
          embedUrl: null as string | null,
          openUrl: json.data?.openUrl?.trim() || trimmedMapsUrl,
          locationLabel: json.data?.locationLabel?.trim() || null,
        };
      }

      return {
        embedUrl,
        openUrl: json.data?.openUrl?.trim() || trimmedMapsUrl,
        locationLabel: json.data?.locationLabel?.trim() || null,
      };
    },
    enabled: canResolve,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const openUrl =
    data?.openUrl || resolveGoogleMapsOpenUrl(trimmedMapsUrl) || trimmedMapsUrl;
  const embedUrl = data?.embedUrl ?? null;
  const locationLabel = data?.locationLabel?.trim() || "Location from Google Maps";

  if (!trimmedMapsUrl) return null;

  return (
    <section className={cn("min-w-0 space-y-3", className)} aria-label={title}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        {openUrl ? (
          <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
            <a href={openUrl} target="_blank" rel="noopener noreferrer">
              {openLabel}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm sm:rounded-[1.75rem]">
        <div className="flex items-start gap-2 border-b border-cp-border bg-cp-elevated/40 px-4 py-3 sm:px-5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
              Google Maps
            </p>
            <p className="mt-0.5 break-words text-sm font-medium text-foreground">
              {isLoading ? "Resolving location…" : locationLabel}
            </p>
          </div>
        </div>

        {!canResolve ? (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm text-cp-muted">
              Enter a valid Google Maps link (maps.google.com or maps.app.goo.gl) to show the
              preview.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex h-48 items-center justify-center bg-cp-elevated/30 sm:h-56 md:h-64">
            <LoadingSpinner size="sm" label="Loading Google Map…" />
          </div>
        ) : embedUrl ? (
          <div className="relative h-48 w-full bg-cp-elevated/30 sm:h-56 md:h-64">
            <iframe
              title={`Google Map — ${locationLabel}`}
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="space-y-3 px-4 py-8 text-center sm:px-5">
            <p className="text-sm text-cp-muted">
              {isError
                ? "Could not load the Google Maps preview right now."
                : "Google Maps preview is unavailable for this link. Open it directly instead."}
            </p>
            {openUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={openUrl} target="_blank" rel="noopener noreferrer">
                  {openLabel}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
