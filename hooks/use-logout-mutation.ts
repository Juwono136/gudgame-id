"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { authRoutes } from "@/lib/constants/routes";
import { syncAuthSessionAfterChange } from "@/lib/session/invalidate-session-context";

/** Isolated from Google/Firebase auth mutations to keep navbar/logout chunks lean. */
export function useLogoutMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error(result.error.message ?? "Sign out failed");
      }
    },
    onSuccess: async () => {
      await syncAuthSessionAfterChange(queryClient);
      toast.success("Signed out", {
        description: "See you on court soon.",
      });
      router.push(authRoutes.login);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error("Sign out failed", { description: error.message });
    },
  });
}
