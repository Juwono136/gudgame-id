"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";

function resolveLiveRefetchInterval(data: TournamentLivePayload | undefined): number {
  const tournamentStatus = data?.tournament.status;
  const matches = data?.matches ?? [];
  const anyInProgress = matches.some((m) => m.status === "in_progress");

  if (anyInProgress) return 2000;
  if (data?.phase === "live" || tournamentStatus === "live") return 5000;
  if (data?.phase === "not_started" || tournamentStatus === "draft" || tournamentStatus === "open") {
    return 8000;
  }
  if (data?.phase === "completed" || tournamentStatus === "completed") return 15000;
  return 5000;
}

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
    refetchInterval: (query) => resolveLiveRefetchInterval(query.state.data),
    refetchIntervalInBackground: false,
  });
}
