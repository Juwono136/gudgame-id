"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { softDevPollMs } from "@/lib/dev/soft-poll";
import type { PartnerManageRegistrationRow } from "@/lib/partners/registration/types";
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";

function key(sportSlug: string, slug: string) {
  return ["tournaments", "partner-registrations", sportSlug, slug] as const;
}

export function usePartnerTournamentRegistrations(
  sportSlug: string,
  slug: string,
  enabled = true,
) {
  return useQuery({
    queryKey: key(sportSlug, slug),
    queryFn: async () => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/manage/partner-registrations`,
        { cache: "no-store" },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { registrations: PartnerManageRegistrationRow[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load registrations"));
      }
      return json.data.registrations;
    },
    enabled: Boolean(sportSlug && slug && enabled),
    staleTime: 0,
    refetchInterval: softDevPollMs(12_000),
    refetchOnWindowFocus: true,
  });
}

export function useCuratePartnerRegistration(sportSlug: string, slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { registrationId: string; action: "confirm" | "decline" }) => {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/manage/partner-registrations/${input.registrationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: input.action }),
        },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { ok: boolean; action: string };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not update registration"));
      }
      return json.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: key(sportSlug, slug) });
      void qc.invalidateQueries({ queryKey: ["tournaments", sportSlug, slug, "participants"] });
      invalidateTournamentQueries(qc, sportSlug, slug);
      toast.success(
        data.action === "confirm"
          ? "Player confirmed — now visible on the public roster"
          : "Registration declined",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
