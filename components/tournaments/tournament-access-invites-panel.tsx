"use client";

import { useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TournamentInviteListItem } from "@/components/tournaments/tournament-invite-list-item";
import { TournamentInviteCreatedDialog } from "@/components/tournaments/tournament-invite-created-dialog";
import {
  useAccessInvites,
  useCreateAccessInvite,
  useRevealAccessInvite,
  useRevokeAccessInvite,
  type AccessInviteView,
} from "@/hooks/use-tournament-invites";
import {
  ACCESS_GRANT_ROLES,
  getAccessGrantRoleLabel,
  isActiveInviteStatus,
} from "@/lib/tournaments/invitations/invite-ui";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type TournamentAccessInvitesPanelProps = {
  sportSlug: string;
  slug: string;
  enabled?: boolean;
  embedded?: boolean;
};

type InviteDetailsState = {
  title: string;
  inviteUrl: string;
  inviteCode?: string;
};

export function TournamentAccessInvitesPanel({
  sportSlug,
  slug,
  enabled = true,
  embedded = false,
}: TournamentAccessInvitesPanelProps) {
  const { confirm } = useConfirmDialog();
  const { data: invites, isLoading } = useAccessInvites(sportSlug, slug, enabled);
  const createInvite = useCreateAccessInvite(sportSlug, slug);
  const revealInvite = useRevealAccessInvite(sportSlug, slug);
  const revokeInvite = useRevokeAccessInvite(sportSlug, slug);
  const [role, setRole] = useState<"scorekeeper" | "bracket_manager">("scorekeeper");
  const [createdInvite, setCreatedInvite] = useState<AccessInviteView | null>(null);
  const [detailsInvite, setDetailsInvite] = useState<InviteDetailsState | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const activeInvites = useMemo(
    () => (invites ?? []).filter((inv) => isActiveInviteStatus(inv.status)),
    [invites],
  );

  const selectedRole = ACCESS_GRANT_ROLES.find((r) => r.value === role);

  const handleCreate = () => {
    createInvite.mutate(
      { role },
      {
        onSuccess: (invite) => setCreatedInvite(invite),
      },
    );
  };

  const handleViewDetails = (invite: AccessInviteView) => {
    setRevealingId(invite.id);
    revealInvite.mutate(invite.id, {
      onSuccess: (credentials) => {
        setDetailsInvite({
          title: `${getAccessGrantRoleLabel(invite.role)} invite details`,
          inviteUrl: credentials.inviteUrl,
          inviteCode: credentials.inviteCode,
        });
      },
      onSettled: () => setRevealingId(null),
    });
  };

  const handleRemove = async (invite: AccessInviteView) => {
    const isAccepted = invite.status === "accepted";
    const ok = await confirm({
      title: isAccepted ? "Revoke staff access?" : "Remove staff invite?",
      description: isAccepted
        ? `${invite.redeemedUserName ?? "This user"} will lose scoring or bracket access immediately.`
        : "This invite link and code will stop working immediately. You can generate a new one anytime.",
      confirmLabel: isAccepted ? "Revoke access" : "Remove invite",
      cancelLabel: "Keep",
      variant: "destructive",
    });
    if (!ok) return;
    revokeInvite.mutate(invite.id);
  };

  return (
    <>
      <div
        className={cn(
          embedded
            ? "space-y-3"
            : "rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5",
        )}
      >
        {!embedded ? (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Scoring & bracket staff</h3>
            <p className="mt-1 text-xs text-cp-muted">
              Scorekeepers update live scores. Bracket managers can also set up and edit the bracket.
            </p>
          </div>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wide text-cp-muted">
            Staff access
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="staff-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger id="staff-role" className="h-10 border-cp-border bg-cp-elevated">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_GRANT_ROLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole ? (
            <p className="text-[11px] leading-relaxed text-cp-muted">{selectedRole.description}</p>
          ) : null}
        </div>

        <Button
          type="button"
          className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
          disabled={createInvite.isPending}
          onClick={handleCreate}
        >
          {createInvite.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Generate staff invite
            </>
          )}
        </Button>

        {isLoading ? (
          <p className="text-sm text-cp-muted">Loading…</p>
        ) : activeInvites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
            No active staff invites. Generate one and share the link or code.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeInvites.map((inv) => (
              <TournamentInviteListItem
                key={inv.id}
                title={getAccessGrantRoleLabel(inv.role)}
                subtitle={inv.email ?? "Shared via link or code"}
                status={inv.status}
                expiresAt={inv.expiresAt ?? undefined}
                inviteUrl={inv.inviteUrl}
                redeemedUserName={inv.redeemedUserName}
                redeemedUserImage={inv.redeemedUserImage}
                onViewDetails={
                  inv.status === "pending" ? () => handleViewDetails(inv) : undefined
                }
                viewingDetails={revealingId === inv.id}
                onRemove={() => void handleRemove(inv)}
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
        title={`${getAccessGrantRoleLabel(createdInvite?.role ?? role)} invite ready`}
        audience="staff"
      />

      <TournamentInviteCreatedDialog
        open={Boolean(detailsInvite)}
        onOpenChange={(open) => !open && setDetailsInvite(null)}
        sportSlug={sportSlug}
        slug={slug}
        inviteUrl={detailsInvite?.inviteUrl}
        inviteCode={detailsInvite?.inviteCode}
        title={detailsInvite?.title ?? "Invite details"}
        audience="staff"
        rotateNotice="Opening details refreshes the link and code. Share the updated credentials with your staff member."
      />
    </>
  );
}
