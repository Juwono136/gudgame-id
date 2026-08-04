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
import { resolveVenueOpenUrl } from "@/lib/maps/venue-maps-url";
import { buildGoogleMapsEmbedUrl } from "@/lib/maps/google-maps-url";
import { VENUE_AUTOCOMPLETE_MIN_CHARS } from "@/lib/maps/venue-search-types";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import { cn } from "@/lib/utils";

type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

type VenueAutocompleteFieldProps = {
  venue: string;
  mapsUrl: string;
  onVenueChange: (value: string) => void;
  onMapsUrlChange: (value: string) => void;
  required?: boolean;
  fieldError?: string | null;
};

export function VenueAutocompleteField({
  venue,
  mapsUrl,
  onVenueChange,
  onMapsUrlChange,
  required = false,
  fieldError,
}: VenueAutocompleteFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(venue);
  const [open, setOpen] = useState(false);
  const [searchConfigured, setSearchConfigured] = useState(true);
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(inputValue, 400);

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

  const queryReady =
    open &&
    debouncedQuery.trim().length >= VENUE_AUTOCOMPLETE_MIN_CHARS &&
    searchConfigured;

  const { data, isFetching, error } = useQuery({
    queryKey: ["maps", "venue", "google", debouncedQuery],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ input: debouncedQuery });
      const res = await fetch(`/api/maps/places/autocomplete?${params}`, { signal });
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          items: PlacePrediction[];
          configured: boolean;
          provider?: "google";
        };
        error?: unknown;
      }>(res);

      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not search locations"));
      }

      setSearchConfigured(json.data.configured);
      return json.data.items;
    },
    enabled: queryReady,
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
            configured?: boolean;
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
  const charsNeeded = Math.max(
    0,
    VENUE_AUTOCOMPLETE_MIN_CHARS - inputValue.trim().length,
  );

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        <Label htmlFor="venue-search">
          Venue
          {required ? <RequiredMark /> : null}
        </Label>
        <p className="mt-1 text-xs text-cp-muted">
          Search Google Maps for the venue, then pick a suggestion to set the location and preview.
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
            className={cn(
              "border-cp-border bg-cp-bg-input pl-9",
              fieldError && "border-red-500/70 focus-visible:ring-red-500/40",
            )}
            required={required}
            aria-required={required}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "venue-search-error" : undefined}
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
        <FieldError id="venue-search-error" message={fieldError} />

        {!searchConfigured ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400/90">
            Google Maps search is unavailable. Enter the venue name manually, or ask an admin to
            configure the Maps API key.
          </p>
        ) : null}

        {open &&
        inputValue.trim().length > 0 &&
        inputValue.trim().length < VENUE_AUTOCOMPLETE_MIN_CHARS &&
        searchConfigured ? (
          <p className="mt-2 text-[11px] text-cp-muted">
            Type {charsNeeded} more character{charsNeeded === 1 ? "" : "s"} to search Google Maps.
          </p>
        ) : null}

        {queryReady ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-cp-border bg-cp-card py-1 shadow-lg"
          >
            {error ? (
              <li className="px-3 py-2.5 text-xs text-red-500 dark:text-red-400">
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
            ) : (
              <li className="px-3 py-3 text-xs text-cp-muted">Searching Google Maps…</li>
            )}
          </ul>
        ) : null}
      </div>

      {embedUrl ? (
        <div className="overflow-hidden rounded-xl border border-cp-border">
          <div className="flex items-center justify-between border-b border-cp-border bg-cp-elevated/50 px-3 py-2 text-xs text-cp-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-cp-primary" />
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
