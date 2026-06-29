"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";

export function useTournamentLive(sportSlug: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: tournamentQueryKeys.live(sportSlug, slug),
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/live`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: TournamentLivePayload;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load live data"));
      }
      return json.data;
    },
    enabled: Boolean(sportSlug && slug && enabled),
    refetchInterval: (query) => {
      const phase = query.state.data?.phase;
      if (phase === "live") return 1500;
      if (phase === "not_started") return 8000;
      return 5000;
    },
  });
}
