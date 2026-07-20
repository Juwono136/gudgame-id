"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TournamentInviteSharePanel } from "@/components/tournaments/tournament-invite-share-panel";
import { publicSportRoutes } from "@/lib/constants/routes";

type TournamentInviteCreatedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportSlug: string;
  slug: string;
  inviteUrl?: string;
  inviteCode?: string;
  title: string;
  audience: "staff" | "player";
  rotateNotice?: string;
};

export function TournamentInviteCreatedDialog({
  open,
  onOpenChange,
  sportSlug,
  slug,
  inviteUrl,
  inviteCode,
  title,
  audience,
  rotateNotice,
}: TournamentInviteCreatedDialogProps) {
  const invitePageUrl = publicSportRoutes.tournamentInvite(sportSlug, slug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto border-cp-border bg-cp-card p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed sm:text-sm">
            {rotateNotice ??
              (audience === "staff"
                ? "Share the link or code (valid up to 7 days, reusable by anyone). After expiry it becomes invalid — generate a new one. Credentials cannot be changed after creation."
                : "Share the link or code (valid up to 7 days, reusable by anyone). After expiry it becomes invalid — generate a new one. Credentials cannot be changed after creation.")}
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <TournamentInviteSharePanel
            inviteUrl={inviteUrl}
            inviteCode={inviteCode}
            invitePageUrl={invitePageUrl}
            compact
          />
        ) : null}

        <DialogFooter className="border-0 bg-transparent p-0 pt-2">
          <Button
            type="button"
            className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
