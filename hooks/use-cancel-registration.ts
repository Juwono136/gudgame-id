"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type CancelRegistrationParams = {
  registrationId: string;
  sportSlug: string;
  slug: string;
  teamName?: string | null;
  redirectTo?: string;
};

export function useCancelRegistration() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [isPending, setIsPending] = useState(false);

  const cancelRegistration = useCallback(
    async ({
      registrationId,
      sportSlug,
      slug,
      teamName,
      redirectTo,
    }: CancelRegistrationParams) => {
      const ok = await confirm({
        title: "Cancel registration?",
        description: teamName
          ? `Team "${teamName}" will be removed and your slot released. You can register again if spots remain.`
          : "Your registration will be cancelled and the slot released.",
        confirmLabel: "Cancel registration",
        cancelLabel: "Keep registration",
        variant: "destructive",
      });
      if (!ok) return false;

      setIsPending(true);
      try {
        const params = new URLSearchParams({ sportSlug, slug });
        const res = await fetch(
          `/api/tournaments/registrations/${registrationId}/confirm?${params}`,
          { method: "DELETE" },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Could not cancel");

        toast.success("Registration cancelled", {
          description: "Check your email and notifications for confirmation.",
        });

        if (redirectTo) router.push(redirectTo);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not cancel registration");
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [confirm, router],
  );

  return { cancelRegistration, isPending };
}
