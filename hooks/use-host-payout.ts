"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";

export type HostPayoutProfile = {
  configured: boolean;
  status: string | null;
  xenditAccountId: string | null;
  businessName: string | null;
  xenPlatformEnabled: boolean;
};

export function useHostPayoutProfile() {
  return useQuery({
    queryKey: ["host", "payout"],
    queryFn: async () => {
      const res = await fetch("/api/host/payout");
      const json = await parseJsonResponse<{
        success: boolean;
        data: HostPayoutProfile;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to load payout profile"));
      }
      return json.data;
    },
  });
}

export function useSetupHostPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/host/payout", { method: "POST" });
      const json = await parseJsonResponse<{
        success: boolean;
        data: HostPayoutProfile;
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to set up payouts"));
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["host", "payout"], data);
      toast.success(
        data.configured
          ? "Payout account is active — registration fees will route to your XenPlatform account."
          : "Payout account created. Complete verification in Xendit if required.",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
