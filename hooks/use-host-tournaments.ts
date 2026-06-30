"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import type { TournamentListItem, TournamentDetail } from "@/lib/tournaments/service";
import type { HostTournamentWorkspace } from "@/lib/tournaments/workspace/service";
import type { TournamentStatus } from "@/db/schema/tournaments";
import type { TournamentUpsertInput } from "@/lib/validations/tournaments";
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";

export function useHostTournamentsList() {
  const { sportSlug } = useDashboardSport();

  return useQuery({
    queryKey: ["host", "tournaments", sportSlug],
    queryFn: async () => {
      const res = await fetch("/api/host/tournaments");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: TournamentListItem[]; sportSlug: string };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournaments"));
      }
      return json.data.items;
    },
  });
}

export function useHostTournamentWorkspace(tournamentId: string) {
  return useQuery({
    queryKey: ["host", "tournaments", tournamentId, "workspace"],
    queryFn: async () => {
      const res = await fetch(`/api/host/tournaments/${tournamentId}/workspace`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { workspace: HostTournamentWorkspace };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load workspace"));
      }
      return json.data.workspace;
    },
    enabled: Boolean(tournamentId),
    refetchInterval: 10000,
  });
}

export function useUpdateTournamentStatus(tournamentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: TournamentStatus) => {
      const res = await fetch(`/api/host/tournaments/${tournamentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { tournament: TournamentDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not update status"));
      }
      return json.data.tournament;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      void qc.invalidateQueries({
        queryKey: ["host", "tournaments", tournamentId, "workspace"],
      });
      toast.success("Tournament status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateHostTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TournamentUpsertInput) => {
      const res = await fetch("/api/host/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { tournament: TournamentDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to create tournament"));
      }
      return json.data.tournament;
    },
    onSuccess: (tournament) => {
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      invalidateTournamentQueries(qc, tournament.sportSlug, tournament.slug);
      toast.success("Tournament created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateHostTournament(tournamentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TournamentUpsertInput) => {
      const res = await fetch(`/api/host/tournaments/${tournamentId}`, {
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
        throw new Error(extractApiErrorMessage(json, "Failed to update tournament"));
      }
      return json.data.tournament;
    },
    onSuccess: (tournament) => {
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      void qc.invalidateQueries({
        queryKey: ["host", "tournaments", tournamentId, "workspace"],
      });
      invalidateTournamentQueries(qc, tournament.sportSlug, tournament.slug);
      toast.success("Tournament updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteHostTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const res = await fetch(`/api/host/tournaments/${tournamentId}`, {
        method: "DELETE",
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to delete tournament"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      toast.success("Tournament deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreatePlayerReclubTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TournamentUpsertInput) => {
      const res = await fetch("/api/tournaments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { tournament: TournamentDetail };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to create Fun Match"));
      }
      return json.data.tournament;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["host", "tournaments"] });
      void qc.invalidateQueries({ queryKey: ["account", "player", "tournaments"] });
      toast.success("Fun Match created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
