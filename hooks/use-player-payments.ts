"use client";

import { useQuery } from "@tanstack/react-query";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type {
  PlayerPaymentHistoryItem,
  PlayerRegistrationItem,
} from "@/lib/tournaments/payments/player-history";

export function usePlayerPayments() {
  return useQuery({
    queryKey: ["player", "payments"],
    queryFn: async () => {
      const res = await fetch("/api/account/player/payments");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: PlayerPaymentHistoryItem[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load payments"));
      }
      return json.data.items;
    },
  });
}

export function usePlayerRegistrations() {
  return useQuery({
    queryKey: ["player", "registrations"],
    queryFn: async () => {
      const res = await fetch("/api/account/player/registrations");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: PlayerRegistrationItem[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load registrations"));
      }
      return json.data.items;
    },
  });
}
