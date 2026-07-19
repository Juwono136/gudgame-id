"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { siteRoutes } from "@/lib/constants/routes";
import { syncAuthSessionAfterChange } from "@/lib/session/invalidate-session-context";

export function useCompleteProfileMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/account/complete-profile", {
        method: "POST",
        body: formData,
      });
      const payload = await parseJsonResponse<{
        error?: string;
        fieldErrors?: Record<string, string[]>;
        message?: string;
      }>(res);
      if (!res.ok) {
        const err = new Error(payload.error ?? "Could not save profile") as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = payload.fieldErrors;
        throw err;
      }
      return payload;
    },
    onSuccess: async (payload) => {
      await syncAuthSessionAfterChange(queryClient);
      toast.success("Profile updated", {
        description: payload.message ?? "Your account details are now complete.",
      });
      router.push(siteRoutes.home);
      router.refresh();
    },
  });
}
