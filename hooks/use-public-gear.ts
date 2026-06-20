"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { PublicGearListItem } from "@/lib/wiki/public-gear";
import type { PublicGearListQuery } from "@/lib/validations/public-wiki";

type GearListResult = {
  items: PublicGearListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function usePublicGearList(sportSlug: string, query: PublicGearListQuery) {
  return useQuery({
    queryKey: ["public", "gear", sportSlug, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.search) params.set("search", query.search);
      params.set("category", query.category);
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const res = await fetch(`/api/public/sports/${sportSlug}/gear?${params.toString()}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: GearListResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load gear"));
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });
}
