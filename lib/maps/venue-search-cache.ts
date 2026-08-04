import type { PlacePrediction } from "@/lib/maps/venue-search-types";

type CacheEntry = {
  items: PlacePrediction[];
  expiresAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

const autocompleteCache = new Map<string, CacheEntry>();

function normalizeQuery(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedAutocomplete(
  provider: "google",
  input: string,
): PlacePrediction[] | null {
  const key = `${provider}:${normalizeQuery(input)}`;
  const entry = autocompleteCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    autocompleteCache.delete(key);
    return null;
  }
  return entry.items;
}

export function setCachedAutocomplete(
  provider: "google",
  input: string,
  items: PlacePrediction[],
): void {
  if (autocompleteCache.size >= MAX_ENTRIES) {
    const oldest = autocompleteCache.keys().next().value;
    if (oldest) autocompleteCache.delete(oldest);
  }
  const key = `${provider}:${normalizeQuery(input)}`;
  autocompleteCache.set(key, {
    items,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
