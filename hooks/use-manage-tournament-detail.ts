"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentDetail } from "@/lib/tournaments/service";

export function useManageTournamentDetail(
  sportSlug: string,
  slug: string,
  initial?: TournamentDetail,
) {
  return useQuery({
    queryKey: ["tournaments", "manage-detail", sportSlug, slug],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/manage/detail`, {
        cache: "no-store",
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { tournament: TournamentDetail; fetchedAt: string };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournament"));
      }
      return json.data.tournament;
    },
    initialData: initial,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
