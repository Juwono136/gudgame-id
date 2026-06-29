"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentsListResult } from "@/lib/tournaments/service";
import type { PublicTournamentsListQuery } from "@/lib/validations/tournaments";

export function usePublicTournamentsList(
  sportSlug: string,
  query: PublicTournamentsListQuery,
) {
  return useQuery({
    queryKey: [
      "public",
      "tournaments",
      sportSlug,
      query.page,
      query.pageSize,
      query.search ?? "",
      query.bucket,
      query.type,
      query.officialBilling ?? "all",
      query.format ?? "all",
      query.category ?? "all",
      query.sortBy,
      query.sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.search) params.set("search", query.search);
      params.set("bucket", query.bucket);
      params.set("type", query.type);
      params.set("status", query.status);
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);
      if (query.officialBilling && query.officialBilling !== "all") {
        params.set("officialBilling", query.officialBilling);
      }
      if (query.format && query.format !== "all") {
        params.set("format", query.format);
      }
      if (query.category && query.category !== "all") {
        params.set("category", query.category);
      }

      const res = await fetch(
        `/api/public/sports/${sportSlug}/tournaments?${params.toString()}`,
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: TournamentsListResult;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tournaments"));
      }
      return json.data;
    },
  });
}
