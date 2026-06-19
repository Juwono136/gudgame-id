"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type {
  PaginatedListResult,
  PlayerMatchDetail,
  PlayerMatchListItem,
  PlayerTournamentListItem,
} from "@/lib/account/player-competition/types";
import type { PlayerMatchListSummary } from "@/lib/account/player-competition/list-matches";
import type {
  PlayerMatchesListQuery,
  PlayerTournamentsListQuery,
} from "@/lib/validations/player-competition";

type ApiSuccess<T> = { success: true; data: T };

function buildQueryString(
  params: Record<string, string | number | undefined>,
  extra?: Record<string, string>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      qs.set(key, value);
    }
  }
  return qs.toString();
}

export function playerMatchesQueryKey(params: Partial<PlayerMatchesListQuery>) {
  return ["account", "player", "matches", params] as const;
}

export function usePlayerMatchesList(
  params: PlayerMatchesListQuery,
  options?: { includeYears?: boolean; includeSummary?: boolean },
) {
  return useQuery({
    queryKey: [
      ...playerMatchesQueryKey(params),
      options?.includeYears ?? false,
      options?.includeSummary ?? false,
    ],
    queryFn: async () => {
      const qs = buildQueryString(
        {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          result: params.result,
          type: params.type,
          year: params.year,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
        },
        {
          ...(options?.includeYears ? { includeYears: "1" } : {}),
          ...(options?.includeSummary ? { includeSummary: "1" } : {}),
        },
      );

      const res = await fetch(`/api/account/player/matches?${qs}`);
      const json = await parseJsonResponse<
        ApiSuccess<
          PaginatedListResult<PlayerMatchListItem> & {
            years?: number[];
            summary?: PlayerMatchListSummary;
          }
        >
      >(res);
      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to load matches");
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function usePlayerMatchDetail(matchId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["account", "player", "matches", "detail", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/account/player/matches/${matchId}`);
      const json = await parseJsonResponse<ApiSuccess<{ match: PlayerMatchDetail }>>(res);
      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to load match details");
      }
      return json.data.match;
    },
    enabled: enabled && matchId != null,
    staleTime: 60_000,
  });
}

export function playerTournamentsQueryKey(params: Partial<PlayerTournamentsListQuery>) {
  return ["account", "player", "tournaments", params] as const;
}

export function usePlayerTournamentsList(
  params: PlayerTournamentsListQuery,
  options?: { includeYears?: boolean },
) {
  return useQuery({
    queryKey: [...playerTournamentsQueryKey(params), options?.includeYears ?? false],
    queryFn: async () => {
      const qs = buildQueryString(
        {
          page: params.page,
          pageSize: params.pageSize,
          scope: params.scope,
          search: params.search,
          year: params.year,
          placement: params.placement,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
        },
        options?.includeYears ? { includeYears: "1" } : undefined,
      );

      const res = await fetch(`/api/account/player/tournaments?${qs}`);
      const json = await parseJsonResponse<
        ApiSuccess<PaginatedListResult<PlayerTournamentListItem> & { years?: number[] }>
      >(res);
      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to load tournaments");
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });
}
