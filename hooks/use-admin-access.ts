"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { AppRole } from "@/lib/roles/constants";

type AdminMeResponse = {
  canAccessAdmin: boolean;
  roles: AppRole[];
  activeRole: AppRole | null;
};

export function useAdminAccess() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const res = await fetch("/api/admin/me");
      const json = await parseJsonResponse<{
        success: boolean;
        data: AdminMeResponse;
      }>(res);
      if (!res.ok) return { canAccessAdmin: false, roles: [], activeRole: null };
      return json.data;
    },
    staleTime: 60_000,
  });
}
