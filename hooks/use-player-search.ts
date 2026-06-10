"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentPlayerSearchResult } from "@/lib/tournaments/players/search";

export function usePlayerSearch(sportSlug: string, query: string, enabled = true) {
  const debounced = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: ["tournaments", "player-search", sportSlug, debounced],
    enabled: enabled && debounced.length >= 2,
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
}
