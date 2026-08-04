"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { AdminDashboardStats } from "@/lib/admin/dashboard/service";
import type { AdminDashboardQueryInput } from "@/lib/validations/admin-dashboard";

type ApiSuccess<T> = { success: true; data: T };

export function adminDashboardQueryKey(
  query: AdminDashboardQueryInput,
  sportSlug: string,
) {
  return [
    "admin",
    "dashboard",
    "stats",
    sportSlug,
    query.range,
    query.from ?? "",
    query.to ?? "",
  ] as const;
}

function buildStatsUrl(query: AdminDashboardQueryInput): string {
  const params = new URLSearchParams({ range: query.range });
  if (query.range === "custom") {
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
  }
  return `/api/admin/dashboard/stats?${params.toString()}`;
}

export function useAdminDashboardStats(
  query: AdminDashboardQueryInput,
  sportSlug: string,
) {
  const enabled =
    query.range !== "custom" || Boolean(query.from && query.to && query.from <= query.to);

  return useQuery({
    queryKey: adminDashboardQueryKey(query, sportSlug),
    queryFn: async () => {
      const res = await fetch(buildStatsUrl(query));
      const json = await parseJsonResponse<ApiSuccess<AdminDashboardStats>>(res);
      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to load dashboard");
      }
      return json.data;
    },
    enabled,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}
