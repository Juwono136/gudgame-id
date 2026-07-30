"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { tournamentQueryKeys, invalidateTournamentQueries } from "@/lib/tournaments/query-keys";
import { softDevPollMs } from "@/lib/dev/soft-poll";

export type TournamentCourtView = {
  id: string;
  courtNumber: number;
  name: string;
  sortOrder: number;
  activeMatchId: string | null;
};

export function useTournamentCourts(sportSlug: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: tournamentQueryKeys.courts(sportSlug, slug),
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/courts`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { courts: TournamentCourtView[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load courts"));
      }
      return json.data.courts;
    },
    refetchInterval: softDevPollMs(8000),
  });
}

export function useRenameTournamentCourt(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { courtId: string; name: string }) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/courts/${input.courtId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: input.name }),
        },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { court: TournamentCourtView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not rename court"));
      }
      return json.data.court;
    },
    onSuccess: () => {
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success("Court renamed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
