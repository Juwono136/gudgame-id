"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type ArchivePartnerPlayerParams = {
  partnerSlug: string;
  playerId: string;
  playerName?: string | null;
  /** When set, navigate here after a successful archive (e.g. back to list). */
  redirectTo?: string;
};

export function useArchivePartnerPlayer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const [isPending, setIsPending] = useState(false);

  const archivePlayer = useCallback(
    async ({ partnerSlug, playerId, playerName, redirectTo }: ArchivePartnerPlayerParams) => {
      const ok = await confirm({
        title: "Remove player from list?",
        description: playerName
          ? `"${playerName}" will be removed from your Players list. Match history is kept for audit. You can register them again later with the same contact details.`
          : "This player will be removed from your Players list. Match history is kept for audit.",
        confirmLabel: "Remove player",
        cancelLabel: "Keep player",
        variant: "destructive",
      });
      if (!ok) return false;

      setIsPending(true);
      try {
        const res = await fetch(
          `/api/partner/public/${encodeURIComponent(partnerSlug)}/players/${encodeURIComponent(playerId)}`,
          { method: "DELETE" },
        );
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: { message?: string };
        } | null;
        if (!res.ok) {
          throw new Error(json?.error?.message ?? "Could not remove player");
        }

        toast.success("Player removed from list");
        await queryClient.invalidateQueries({ queryKey: ["partner-players", partnerSlug] });
        await queryClient.invalidateQueries({
          queryKey: ["partner-player-detail", partnerSlug, playerId],
        });

        if (redirectTo) router.push(redirectTo);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remove player");
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [confirm, queryClient, router],
  );

  return { archivePlayer, isPending };
}
