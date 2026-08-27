"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { PartnerPlayerSearchResult } from "@/lib/partners/registration/search-players";

const DEBOUNCE_MS = 300;

export function usePartnerPlayerSearch(
  partnerSlug: string,
  query: string,
  options?: {
    enabled?: boolean;
    excludePlayerIds?: string[];
  },
) {
  const trimmed = query.trim();
  const debounced = useDebounce(trimmed, DEBOUNCE_MS);
  const isDebouncing = trimmed !== debounced;
  const excludeKey = (options?.excludePlayerIds ?? []).slice().sort().join(",");
  const canSearch = (options?.enabled ?? true) && debounced.length >= 2;

  const queryResult = useQuery({
    queryKey: ["partner", "player-search", partnerSlug, debounced, excludeKey],
    enabled: canSearch,
    queryFn: async () => {
      const params = new URLSearchParams({ q: debounced });
      if (excludeKey) params.set("exclude", excludeKey);
      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/players/search?${params}`,
        { credentials: "include" },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { results: PartnerPlayerSearchResult[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Search failed"));
      }
      return json.data.results;
    },
    staleTime: 30_000,
  });

  return {
    ...queryResult,
    debouncedQuery: debounced,
    isDebouncing,
    isSearching: trimmed.length >= 2 && (isDebouncing || queryResult.isFetching),
  };
}
