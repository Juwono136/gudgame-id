"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import type { TournamentsListResult } from "@/lib/tournaments/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";

export function useCreatorTournamentHistory(query: TournamentsListQuery) {
  const { sportSlug } = useDashboardSport();

  return useQuery({
    queryKey: ["account", "tournaments", "created", sportSlug, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.search) params.set("search", query.search);
      params.set("status", query.status ?? "all");
      if (query.tournamentType && query.tournamentType !== "all") {
        params.set("tournamentType", query.tournamentType);
      }
      if (query.officialBilling && query.officialBilling !== "all") {
        params.set("officialBilling", query.officialBilling);
      }
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const res = await fetch(`/api/account/tournaments/created?${params.toString()}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: TournamentsListResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournament history"));
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useTournamentArchive(tournamentId: string | null) {
  return useQuery({
    queryKey: ["account", "tournaments", "archive", tournamentId],
    queryFn: async () => {
      const res = await fetch(`/api/account/tournaments/created/${tournamentId}/archive`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { archive: { id: string; snapshot: unknown; archivedAt: string; statsTier: string } };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Archive not available yet"));
      }
      return json.data.archive;
    },
    enabled: Boolean(tournamentId),
  });
}
