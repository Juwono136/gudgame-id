"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentTierEligibilityView } from "@/lib/tournaments/tier-restrictions";

export type TournamentTierEligibilityResponse = TournamentTierEligibilityView & {
  isAuthenticated: boolean;
};

export function useTournamentTierEligibility(
  sportSlug: string,
  slug: string,
  options?: { enabled?: boolean },
) {
  const canFetch = Boolean(sportSlug && slug) && (options?.enabled ?? true);

  return useQuery({
    queryKey: ["tournaments", sportSlug, slug, "tier-eligibility"],
    enabled: canFetch,
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/tier-eligibility`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: TournamentTierEligibilityResponse;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load tier eligibility"));
      }
      return json.data;
    },
    staleTime: 60_000,
  });
}
