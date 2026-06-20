"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { GearSearchListItem } from "@/lib/wiki/gear/mapper";

type GearSearchResponse = {
  success: boolean;
  data: { items: GearSearchListItem[] };
  error?: unknown;
};

export function useGearSearch(sportSlug: string, query: string, enabled = true) {
  const debounced = useDebounce(query, 400);

  return useQuery({
    queryKey: ["gear", "search", sportSlug, debounced],
    queryFn: async () => {
      const params = new URLSearchParams({
        sportSlug,
        q: debounced,
      });
      const res = await fetch(`/api/gear/search?${params}`);
      const json = await parseJsonResponse<GearSearchResponse>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Gear search failed"));
      }
      return json.data?.items ?? [];
    },
    enabled: enabled && debounced.trim().length >= 2,
    staleTime: 30_000,
  });
}
