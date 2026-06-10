"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { PublicPlayerListItem } from "@/lib/wiki/public";
import type { PublicPlayersListQuery } from "@/lib/validations/public-wiki";

type PlayersListResult = {
  items: PublicPlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function usePublicPlayersList(sportSlug: string, query: PublicPlayersListQuery) {
  return useQuery({
    queryKey: ["public", "players", sportSlug, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.search) params.set("search", query.search);
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const res = await fetch(`/api/public/sports/${sportSlug}/players?${params.toString()}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: PlayersListResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load players"));
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });
}
