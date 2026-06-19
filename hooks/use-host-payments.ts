"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type { TournamentId } from "@/lib/domain/tournaments";
import type { HostPaymentRecord } from "@/lib/tournaments/payments/host-history";

export function useHostPayments(tournamentId?: TournamentId) {
  return useQuery({
    queryKey: ["host", "payments", tournamentId ?? "all"],
    queryFn: async () => {
      const params = tournamentId ? `?tournamentId=${tournamentId}` : "";
      const res = await fetch(`/api/host/payments${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: HostPaymentRecord[] };
        error?: unknown;
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Failed to load payments"));
      return json.data.items;
    },
  });
}
