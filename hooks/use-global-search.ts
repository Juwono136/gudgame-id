"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { GlobalSearchResponse } from "@/lib/wiki/global-search";

type UseGlobalSearchOptions = {
  query: string;
  sportSlug?: string;
  limit?: number;
  enabled?: boolean;
};

export function useGlobalSearch({
  query,
  sportSlug,
  limit = 8,
  enabled = true,
}: UseGlobalSearchOptions) {
  const trimmed = query.trim();
  const canSearch = enabled && trimmed.length >= 2;

  return useQuery({
    queryKey: ["global-search", trimmed, sportSlug ?? "all", limit],
    queryFn: async () => {
      const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
      if (sportSlug) params.set("sportSlug", sportSlug);

      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: GlobalSearchResponse;
      }>(res);

      if (!res.ok || !json.success) {
        throw new Error("Search failed");
      }

      return json.data;
    },
    enabled: canSearch,
    staleTime: 30_000,
    retry: 1,
  });
}
