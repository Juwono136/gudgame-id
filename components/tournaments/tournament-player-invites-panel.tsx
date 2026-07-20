"use client";

import { useMemo, useState } from "react";
import { Link2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentInviteListItem } from "@/components/tournaments/tournament-invite-list-item";
import { TournamentInviteCreatedDialog } from "@/components/tournaments/tournament-invite-created-dialog";
import {
  useCreatePlayerInvite,
  usePlayerInvites,
  useRevokePlayerInvite,
  type PlayerInviteView,
} from "@/hooks/use-tournament-invites";
import { INVITE_HOST_COPY, isActiveInviteStatus } from "@/lib/tournaments/invitations/invite-ui";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type TournamentPlayerInvitesPanelProps = {
  sportSlug: string;
  slug: string;
  teamId?: string | null;
  enabled?: boolean;
  embedded?: boolean;
  /** Fun Match vs free official — adjusts helper copy only */
  variant?: "fun_match" | "official_free";
};

type InviteDetailsState = {
  title: string;
  inviteUrl: string;
  inviteCode?: string;
};

export function TournamentPlayerInvitesPanel({
  sportSlug,
  slug,
  teamId,
  enabled = true,
  embedded = false,
  variant = "fun_match",
}: TournamentPlayerInvitesPanelProps) {
  const { confirm } = useConfirmDialog();
  const { data: invites, isLoading } = usePlayerInvites(sportSlug, slug, enabled);
  const createInvite = useCreatePlayerInvite(sportSlug, slug);
  const revokeInvite = useRevokePlayerInvite(sportSlug, slug);
  const [createdInvite, setCreatedInvite] = useState<PlayerInviteView | null>(null);
  const [detailsInvite, setDetailsInvite] = useState<InviteDetailsState | null>(null);

  const activeInviteLinks = useMemo(
    () =>
      (invites ?? []).filter(
        (inv) => isActiveInviteStatus(inv.status) && inv.status === "pending",
      ),
    [invites],
  );

  const joinedPlayers = useMemo(
    () =>
      (invites ?? []).filter(
        (inv) =>
          isActiveInviteStatus(inv.status) &&
          inv.status === "accepted" &&
          Boolean(inv.redeemedByUserId),
      ),
    [invites],
  );

  const handleCreate = async () => {
    const ok = await confirm({
      title: "Generate player invite?",
      description: `Create a reusable link and code valid for ${INVITE_HOST_COPY.validityDays} days. Anyone can use it to join while it is active. You can generate unlimited invites.`,
      confirmLabel: "Generate",
    });
    if (!ok) return;
    createInvite.mutate(teamId ? { teamId } : {}, {
      onSuccess: (invite) => setCreatedInvite(invite),
    });
  };

  const handleViewDetails = (invite: PlayerInviteView) => {
    if (!invite.inviteUrl) return;
    setDetailsInvite({
      title: "Player invite details",
      inviteUrl: invite.inviteUrl,
      inviteCode: invite.inviteCode,
    });
  };

  const handleRemoveLink = async (inviteId: string) => {
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
            : "rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 sm:p-5 dark:bg-emerald-950/10",
        )}
      >
        {!embedded ? (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Player invites</h3>
            <p className="mt-1 text-xs text-cp-muted">
              {variant === "official_free"
                ? "Share a link or code (valid 7 days) so players can register for this free official tournament."
                : "Share a link or code (valid 7 days) so friends can join this Fun Match through the lobby."}
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-cp-border/80 bg-cp-elevated/15 px-3 py-2.5 text-xs text-cp-muted">
          {INVITE_HOST_COPY.playerInfo}
        </div>

        <Button
          type="button"
          size="sm"
          className="h-10 w-full bg-emerald-600 hover:bg-emerald-500 sm:w-auto"
          disabled={createInvite.isPending}
          onClick={() => void handleCreate()}
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
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Active invite links ({activeInviteLinks.length})
              </h4>
              {activeInviteLinks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
                  No active player invites yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeInviteLinks.map((inv) => (
                    <TournamentInviteListItem
                      key={inv.id}
                      title="Player invite"
                      subtitle={
                        inv.teamId ? "Pre-assigned squad" : "Player picks squad on join"
                      }
                      status={inv.status}
                      expiresAt={inv.expiresAt ?? undefined}
                      inviteUrl={inv.inviteUrl}
                      inviteCode={inv.inviteCode}
                      onViewDetails={() => handleViewDetails(inv)}
                      onRemove={() => void handleRemoveLink(inv.id)}
                      removing={revokeInvite.isPending}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-semibold text-foreground">
                  Joined via invite ({joinedPlayers.length})
                </h4>
              </div>
              {joinedPlayers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
                  Players who redeem an invite appear here. To remove a team from the tournament,
                  use the Registrations tab.
                </p>
              ) : (
                <ul className="space-y-2">
                  {joinedPlayers.map((inv) => (
                    <TournamentInviteListItem
                      key={inv.id}
                      title="Player"
                      subtitle="Joined via invite"
                      status={inv.status}
                      redeemedUserName={inv.redeemedByName}
                      redeemedUserImage={inv.redeemedByImage}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
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

      <TournamentInviteCreatedDialog
        open={Boolean(detailsInvite)}
        onOpenChange={(open) => !open && setDetailsInvite(null)}
        sportSlug={sportSlug}
        slug={slug}
        inviteUrl={detailsInvite?.inviteUrl}
        inviteCode={detailsInvite?.inviteCode}
        title={detailsInvite?.title ?? "Invite details"}
        audience="player"
      />
    </>
  );
}
