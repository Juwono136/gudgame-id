"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { ViewerPartnerRegistrationStatus } from "@/lib/partners/registration/service";
import { softDevPollMs } from "@/lib/dev/soft-poll";

export function usePartnerRegistrationStatus(
  partnerSlug: string | undefined,
  tournamentSlug: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["partner", "registration-status", partnerSlug, tournamentSlug],
    queryFn: async (): Promise<ViewerPartnerRegistrationStatus> => {
      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug!)}/tournaments/${encodeURIComponent(tournamentSlug)}/registration-status`,
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: ViewerPartnerRegistrationStatus;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load registration status"));
      }
      return json.data;
    },
    enabled: Boolean(enabled && partnerSlug && tournamentSlug),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "awaiting_payment" || status === "registered") {
        return softDevPollMs(8000);
      }
      return softDevPollMs(30000);
    },
  });
}
