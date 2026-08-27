"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentPlayerSearchResult } from "@/lib/tournaments/players/search";

const DEBOUNCE_MS = 300;

export function usePlayerSearch(sportSlug: string, query: string, enabled = true) {
  const trimmed = query.trim();
  const debounced = useDebounce(trimmed, DEBOUNCE_MS);
  const isDebouncing = trimmed !== debounced;
  const canSearch = enabled && debounced.length >= 2;

  const queryResult = useQuery({
    queryKey: ["tournaments", "player-search", sportSlug, debounced],
    enabled: canSearch,
    queryFn: async () => {
      const params = new URLSearchParams({
        sportSlug,
        q: debounced,
      });
      const res = await fetch(`/api/tournaments/players/search?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { results: TournamentPlayerSearchResult[] };
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
    /** True while the typed query is waiting to settle or the request is in flight. */
    isSearching: trimmed.length >= 2 && (isDebouncing || queryResult.isFetching),
  };
}
