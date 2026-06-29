"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { adminRoutes } from "@/lib/constants/routes";
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type {
  TournamentUpsertInput,
  TournamentsListQuery,
} from "@/lib/validations/tournaments";

export function useCreateTournament() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: TournamentUpsertInput) => {
      const res = await fetch("/api/admin/tournaments", {
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
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      void qc.invalidateQueries({ queryKey: ["admin", "tournaments"] });
      toast.success("Tournament created");
      router.push(adminRoutes.wikiEntities);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateAdminTournament(tournamentId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: TournamentUpsertInput) => {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
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
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      void qc.invalidateQueries({ queryKey: ["admin", "tournaments"] });
      invalidateTournamentQueries(qc, tournament.sportSlug, tournament.slug);
      toast.success("Tournament updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAdminTournament() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "DELETE",
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to delete tournament"));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "wiki-entities"] });
      void qc.invalidateQueries({ queryKey: ["admin", "tournaments"] });
      toast.success("Tournament deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAdminTournamentsList(query: TournamentsListQuery) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);

  return useQuery({
    queryKey: ["admin", "tournaments", query],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tournaments?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          items: TournamentDetail[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
          sportSlug: string;
        };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournaments"));
      }
      return json.data;
    },
  });
}
