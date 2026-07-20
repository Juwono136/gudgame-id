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

  // Floor intervals protect Postgres under many concurrent spectators.
  if (anyInProgress) return 4000;
  if (data?.phase === "live" || tournamentStatus === "live") return 6000;
  if (data?.phase === "not_started" || tournamentStatus === "draft" || tournamentStatus === "open") {
    return 10000;
  }
  if (data?.phase === "completed" || tournamentStatus === "completed") return 20000;
  return 8000;
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
