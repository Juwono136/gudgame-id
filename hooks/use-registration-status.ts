"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { UserRegistrationStatus } from "@/lib/tournaments/registration/service";

export function useRegistrationStatus(sportSlug: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: ["tournaments", "registration-status", sportSlug, slug],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/registration-status`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: UserRegistrationStatus & { isAuthenticated: boolean };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load status"));
      }
      return json.data;
    },
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending_payment" || status === "awaiting_confirmation") {
        return 3000;
      }
      return 15000;
    },
  });
}
