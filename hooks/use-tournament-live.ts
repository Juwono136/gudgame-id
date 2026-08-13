"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { resolveLiveRefetchIntervalMs } from "@/lib/tournaments/live/poll-intervals";
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
    staleTime: 0,
    refetchInterval: (query) => resolveLiveRefetchIntervalMs(query.state.data),
    refetchIntervalInBackground: false,
  });
}
