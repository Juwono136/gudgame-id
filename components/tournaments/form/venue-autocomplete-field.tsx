"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { buildVenueOpenUrl, resolveVenueOpenUrl } from "@/lib/maps/venue-maps-url";
import { buildGoogleMapsEmbedUrl } from "@/lib/maps/google-maps-url";
import { cn } from "@/lib/utils";

type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

type VenueSearchProvider = "google" | "osm";

type VenueAutocompleteFieldProps = {
  venue: string;
  mapsUrl: string;
  onVenueChange: (value: string) => void;
  onMapsUrlChange: (value: string) => void;
  required?: boolean;
};

function isGooglePlaceId(placeId: string): boolean {
  return placeId.startsWith("g:");
}

export function VenueAutocompleteField({
  venue,
  mapsUrl,
  onVenueChange,
  onMapsUrlChange,
  required = false,
}: VenueAutocompleteFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(venue);
  const [open, setOpen] = useState(false);
  const [searchConfigured, setSearchConfigured] = useState(true);
  const [searchProvider, setSearchProvider] = useState<VenueSearchProvider>("google");
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(inputValue, 550);

  useEffect(() => {
    setInputValue(venue);
  }, [venue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isFetching, error } = useQuery({
    queryKey: ["maps", "venue", debouncedQuery],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ input: debouncedQuery });
      const res = await fetch(`/api/maps/places/autocomplete?${params}`, { signal });
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          items: PlacePrediction[];
          configured: boolean;
          provider?: VenueSearchProvider;
        };
        error?: unknown;
      }>(res);

      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not search locations"));
      }

      setSearchConfigured(json.data.configured);
      if (json.data.provider) {
        setSearchProvider(json.data.provider);
      }
      return json.data.items;
    },
    enabled: open && debouncedQuery.trim().length >= 2 && searchConfigured,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: embedUrlFromApi } = useQuery({
    queryKey: ["maps", "embed", mapsUrl, venue],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ venue });
      if (mapsUrl.trim()) params.set("mapsUrl", mapsUrl);
      const res = await fetch(`/api/maps/embed-url?${params}`, { signal });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { embedUrl: string | null };
      }>(res);
      if (!res.ok) return null;
      return json.data.embedUrl;
    },
    enabled: Boolean(venue.trim() || mapsUrl.trim()),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const selectPlace = useCallback(
    async (prediction: PlacePrediction) => {
      setOpen(false);
      setSelectingPlaceId(prediction.placeId);

      try {
        const label = prediction.mainText || prediction.description;

        if (
          isGooglePlaceId(prediction.placeId) ||
          (prediction.latitude === 0 && prediction.longitude === 0)
        ) {
          const params = new URLSearchParams({ placeId: prediction.placeId });
          const res = await fetch(`/api/maps/places/details?${params}`);
          const json = await parseJsonResponse<{
            success: boolean;
            data: {
              place: {
                name: string;
                formattedAddress: string;
                mapsUrl: string;
              } | null;
            };
            error?: unknown;
          }>(res);

          if (!res.ok || !json.data.place) {
            throw new Error(extractApiErrorMessage(json, "Could not load place details"));
          }

          const place = json.data.place;
          setInputValue(place.name);
          onVenueChange(place.name);
          onMapsUrlChange(place.mapsUrl);
          return;
        }

        setInputValue(label);
        onVenueChange(label);
        onMapsUrlChange(
          buildVenueOpenUrl(prediction.latitude, prediction.longitude, label),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not select this location");
      } finally {
        setSelectingPlaceId(null);
      }
    },
    [onMapsUrlChange, onVenueChange],
  );

  const embedUrl =
    embedUrlFromApi ?? buildGoogleMapsEmbedUrl(mapsUrl, venue) ?? null;
  const openUrl = resolveVenueOpenUrl(mapsUrl, venue);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        <Label htmlFor="venue-search">
          Venue
          {required ? <span className="text-red-400"> *</span> : null}
        </Label>
        <p className="mt-1 text-xs text-cp-muted">
          Search with Google Maps when available — automatically falls back to OpenStreetMap if
          Google is unavailable or out of quota. Pick a suggestion to fill the venue and map preview.
        </p>

        <div className="relative mt-1.5">
          <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
          <Input
            id="venue-search"
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value;
              setInputValue(next);
              onVenueChange(next);
              if (!next.trim()) onMapsUrlChange("");
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search venue or address…"
            className="border-cp-border bg-cp-bg-input pl-9"
            required={required}
            aria-required={required}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            autoComplete="off"
            disabled={Boolean(selectingPlaceId)}
          />
          {isFetching || selectingPlaceId ? (
            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-cp-muted" />
          ) : null}
        </div>

        {!searchConfigured ? (
          <p className="mt-2 text-xs text-amber-400/90">
            Location search is temporarily unavailable. You can still enter a venue name manually.
          </p>
        ) : null}

        {open && debouncedQuery.trim().length >= 2 && searchConfigured ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-cp-border bg-cp-card py-1 shadow-lg"
          >
            {error ? (
              <li className="px-3 py-2 text-xs text-red-400">
                {error instanceof Error ? error.message : "Search failed"}
              </li>
            ) : data?.length ? (
              data.map((place) => (
                <li key={place.placeId} role="option">
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-cp-elevated/60 disabled:opacity-50"
                    disabled={Boolean(selectingPlaceId)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void selectPlace(place)}
                  >
                    <span className="font-medium text-foreground">{place.mainText}</span>
                    {place.secondaryText ? (
                      <span className="text-xs text-cp-muted">{place.secondaryText}</span>
                    ) : null}
                  </button>
                </li>
              ))
            ) : !isFetching ? (
              <li className="px-3 py-3 text-xs text-cp-muted">No locations found</li>
            ) : null}
          </ul>
        ) : null}

        {searchProvider === "osm" && debouncedQuery.trim().length >= 2 && !isFetching ? (
          <p className="mt-2 text-[11px] text-cp-muted">
            Showing OpenStreetMap results (Google Maps unavailable or no matches).
          </p>
        ) : null}
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
            className={cn("h-48 w-full border-0 sm:h-56")}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
    </div>
  );
}
