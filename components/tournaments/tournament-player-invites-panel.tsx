"use client";

import { useMemo, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentInviteListItem } from "@/components/tournaments/tournament-invite-list-item";
import { TournamentInviteCreatedDialog } from "@/components/tournaments/tournament-invite-created-dialog";
import {
  useCreatePlayerInvite,
  usePlayerInvites,
  useRevokePlayerInvite,
  type PlayerInviteView,
} from "@/hooks/use-tournament-invites";
import { isActiveInviteStatus } from "@/lib/tournaments/invitations/invite-ui";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type TournamentPlayerInvitesPanelProps = {
  sportSlug: string;
  slug: string;
  teamId?: string | null;
  enabled?: boolean;
  embedded?: boolean;
};

export function TournamentPlayerInvitesPanel({
  sportSlug,
  slug,
  teamId,
  enabled = true,
  embedded = false,
}: TournamentPlayerInvitesPanelProps) {
  const { confirm } = useConfirmDialog();
  const { data: invites, isLoading } = usePlayerInvites(sportSlug, slug, enabled);
  const createInvite = useCreatePlayerInvite(sportSlug, slug);
  const revokeInvite = useRevokePlayerInvite(sportSlug, slug);
  const [createdInvite, setCreatedInvite] = useState<PlayerInviteView | null>(null);

  const activeInvites = useMemo(
    () => (invites ?? []).filter((inv) => isActiveInviteStatus(inv.status)),
    [invites],
  );

  const handleCreate = () => {
    createInvite.mutate(teamId ? { teamId } : {}, {
      onSuccess: (invite) => setCreatedInvite(invite),
    });
  };

  const handleRemove = async (inviteId: string) => {
    const ok = await confirm({
      title: "Remove player invite?",
      description:
        "This invite link and code will stop working immediately. Generate a new one if needed.",
      confirmLabel: "Remove invite",
      cancelLabel: "Keep",
      variant: "destructive",
    });
    if (!ok) return;
    revokeInvite.mutate(inviteId);
  };

  return (
    <>
      <div
        className={cn(
          embedded
            ? "space-y-3"
            : "rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-4 sm:p-5",
        )}
      >
        {!embedded ? (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Player invites</h3>
            <p className="mt-1 text-xs text-cp-muted">
              Let friends join this Fun Match via link or code through the lobby.
            </p>
          </div>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
            Player invites
          </p>
        )}

        <Button
          type="button"
          size="sm"
          className="h-10 w-full bg-emerald-600 hover:bg-emerald-500 sm:w-auto"
          disabled={createInvite.isPending}
          onClick={handleCreate}
        >
          {createInvite.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Link2 className="mr-1.5 h-4 w-4" />
              Generate player invite
            </>
          )}
        </Button>

        {isLoading ? (
          <p className="text-sm text-cp-muted">Loading…</p>
        ) : activeInvites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
            No active player invites yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeInvites.map((inv) => (
              <TournamentInviteListItem
                key={inv.id}
                title="Player invite"
                subtitle={inv.teamId ? "Pre-assigned squad" : "Player picks squad on join"}
                status={inv.status}
                expiresAt={inv.expiresAt ?? undefined}
                inviteUrl={inv.inviteUrl}
                onRemove={
                  inv.status === "pending" ? () => void handleRemove(inv.id) : undefined
                }
                removing={revokeInvite.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      <TournamentInviteCreatedDialog
        open={Boolean(createdInvite)}
        onOpenChange={(open) => !open && setCreatedInvite(null)}
        sportSlug={sportSlug}
        slug={slug}
        inviteUrl={createdInvite?.inviteUrl}
        inviteCode={createdInvite?.inviteCode}
        title="Player invite ready"
        audience="player"
      />
    </>
  );
}
