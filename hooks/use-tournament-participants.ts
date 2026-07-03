"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import type { TournamentParticipantsResult } from "@/lib/tournaments/participants/query";

type UseTournamentParticipantsOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

export function useTournamentParticipants(
  sportSlug: string,
  slug: string,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  options?: UseTournamentParticipantsOptions,
) {
  const canFetch = Boolean(sportSlug && slug) && (options?.enabled ?? true);

  return useQuery({
    queryKey: ["tournaments", sportSlug, slug, "participants", page, pageSize],
    enabled: canFetch,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/participants?${params.toString()}`,
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: TournamentParticipantsResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load participants"));
      }
      return json.data;
    },
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}
