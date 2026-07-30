"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { HostTournamentWorkspace } from "@/lib/tournaments/workspace/service";
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";
import type { TournamentUpsertInput } from "@/lib/validations/tournaments";
import { softDevPollMs } from "@/lib/dev/soft-poll";

export function useManageTournamentWorkspace(tournamentId: string) {
  return useQuery({
    queryKey: ["manage", "tournaments", tournamentId, "workspace"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/manage/${tournamentId}/workspace`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { workspace: HostTournamentWorkspace };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournament workspace"));
      }
      return json.data.workspace;
    },
    enabled: Boolean(tournamentId),
    refetchInterval: softDevPollMs(10_000),
  });
}

export function useUpdateManageTournament(tournamentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TournamentUpsertInput) => {
      const res = await fetch(`/api/tournaments/manage/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { tournament: TournamentDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not update tournament"));
      }
      return json.data.tournament;
    },
    onSuccess: (tournament) => {
      void qc.invalidateQueries({ queryKey: ["account", "player", "tournaments"] });
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      void qc.invalidateQueries({ queryKey: ["public", "tournaments"] });
      void qc.invalidateQueries({
        queryKey: ["manage", "tournaments", tournamentId, "workspace"],
      });
      invalidateTournamentQueries(qc, tournament.sportSlug, tournament.slug);
      toast.success("Tournament updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteManageTournament() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const res = await fetch(`/api/tournaments/manage/${tournamentId}`, {
        method: "DELETE",
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { deleted: boolean };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not delete tournament"));
      }
      return json.data.deleted;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "player", "tournaments"] });
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      void qc.invalidateQueries({ queryKey: ["public", "tournaments"] });
      toast.success("Tournament deleted");
      router.push(dashboardRoutes.tournaments);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
