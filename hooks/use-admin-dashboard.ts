"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { AdminDashboardStats } from "@/lib/admin/dashboard/service";
import type { AdminDashboardRange } from "@/lib/validations/admin-dashboard";

type ApiSuccess<T> = { success: true; data: T };

export function adminDashboardQueryKey(range: AdminDashboardRange, sportSlug: string) {
  return ["admin", "dashboard", "stats", sportSlug, range] as const;
}

export function useAdminDashboardStats(range: AdminDashboardRange, sportSlug: string) {
  return useQuery({
    queryKey: adminDashboardQueryKey(range, sportSlug),
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard/stats?range=${range}`);
      const json = await parseJsonResponse<ApiSuccess<AdminDashboardStats>>(res);
      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to load dashboard");
      }
      return json.data;
    },
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}
