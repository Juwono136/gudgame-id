"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import type { TournamentAuditReport } from "@/lib/tournaments/archives/audit-report";
import type { CreatorTournamentCounts, CreatorTournamentScope } from "@/lib/tournaments/archives/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";

export type CreatorTournamentHistoryItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tournamentType: string;
  officialBilling: string | null;
  format: string | null;
  categoryLabel: string | null;
  venue?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  sportSlug: string;
  sportName: string;
};

export type CreatorTournamentHistoryResult = {
  items: CreatorTournamentHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts?: CreatorTournamentCounts;
  sportSlug?: string;
  scope?: CreatorTournamentScope;
};

export type TournamentArchiveView = {
  id: string;
  tournamentId: string;
  statsTier: string;
  archivedAt: string;
  report: TournamentAuditReport;
};

export function useCreatorTournamentHistory(
  query: TournamentsListQuery,
  scope: CreatorTournamentScope = "all",
) {
  const { sportSlug } = useDashboardSport();

  return useQuery({
    queryKey: ["account", "tournaments", "created", sportSlug, scope, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      params.set("scope", scope);
      if (query.search) params.set("search", query.search);
      params.set("status", query.status ?? "all");
      if (query.tournamentType && query.tournamentType !== "all") {
        params.set("tournamentType", query.tournamentType);
      }
      if (query.officialBilling && query.officialBilling !== "all") {
        params.set("officialBilling", query.officialBilling);
      }
      if (query.format && query.format !== "all") {
        params.set("format", query.format);
      }
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const res = await fetch(`/api/account/tournaments/created?${params.toString()}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: CreatorTournamentHistoryResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournament history"));
      }
      return json.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useTournamentArchive(tournamentId: string | null) {
  return useQuery({
    queryKey: ["account", "tournaments", "archive", tournamentId],
    queryFn: async () => {
      const res = await fetch(`/api/account/tournaments/created/${tournamentId}/archive`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { archive: TournamentArchiveView };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Final record not available yet"));
      }
      return json.data.archive;
    },
    enabled: Boolean(tournamentId),
    retry: 1,
    staleTime: 60_000,
  });
}
