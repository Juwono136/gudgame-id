"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";
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
  useRevokeAccessInvite,
  type AccessInviteView,
} from "@/hooks/use-tournament-invites";
import {
  ACCESS_GRANT_ROLES,
  getAccessGrantRoleLabel,
  INVITE_HOST_COPY,
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
  const { data: invites, isLoading, isError, error, refetch } = useAccessInvites(
    sportSlug,
    slug,
    enabled,
  );
  const createInvite = useCreateAccessInvite(sportSlug, slug);
  const revokeInvite = useRevokeAccessInvite(sportSlug, slug);
  const [role, setRole] = useState<"scorekeeper" | "bracket_manager">("scorekeeper");
  const [createdInvite, setCreatedInvite] = useState<AccessInviteView | null>(null);
  const [detailsInvite, setDetailsInvite] = useState<InviteDetailsState | null>(null);

  const activeInviteLinks = useMemo(
    () =>
      (invites ?? []).filter(
        (inv) => isActiveInviteStatus(inv.status) && inv.status === "pending",
      ),
    [invites],
  );

  const activeStaff = useMemo(
    () =>
      (invites ?? []).filter(
        (inv) => isActiveInviteStatus(inv.status) && inv.status === "accepted",
      ),
    [invites],
  );

  const selectedRole = ACCESS_GRANT_ROLES.find((r) => r.value === role);

  const handleCreate = async () => {
    const ok = await confirm({
      title: "Generate staff invite?",
      description: `Create a reusable ${selectedRole?.label ?? role} link and code valid for ${INVITE_HOST_COPY.validityDays} days. Anyone with the credentials can accept while signed in. You can generate unlimited invites.`,
      confirmLabel: "Generate invite",
    });
    if (!ok) return;

    createInvite.mutate(
      { role },
      {
        onSuccess: (invite) => setCreatedInvite(invite),
      },
    );
  };

  const handleViewDetails = (invite: AccessInviteView) => {
    if (!invite.inviteUrl) return;
    setDetailsInvite({
      title: `${getAccessGrantRoleLabel(invite.role)} invite details`,
      inviteUrl: invite.inviteUrl,
      inviteCode: invite.inviteCode,
    });
  };

  const handleRemove = async (invite: AccessInviteView) => {
    const isAccepted = invite.status === "accepted";
    const ok = await confirm({
      title: isAccepted ? "Revoke staff access?" : "Remove staff invite?",
      description: isAccepted
        ? `${invite.redeemedUserName ?? "This user"} will lose manage access immediately.`
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
          embedded ? "space-y-4" : "rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5",
        )}
      >
        {!embedded ? (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Scoring & bracket staff</h3>
            <p className="mt-1 text-xs text-cp-muted">
              Invite trusted people via link or code (valid 7 days). Only the tournament organizer
              can create or revoke staff invites.
            </p>
          </div>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-cp-primary/20 bg-cp-primary/5 p-3 sm:p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed text-cp-muted">
            <p className="font-medium text-foreground">
              Link & code only · {INVITE_HOST_COPY.validityDays} days · unlimited generate
            </p>
            <p className="mt-1">{INVITE_HOST_COPY.staffInfo}</p>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-elevated/20 p-4">
          <div className="grid gap-4">
            <div className="space-y-2 max-w-md">
              <Label htmlFor="staff-role">Staff role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)} modal={false}>
                <SelectTrigger
                  id="staff-role"
                  className="h-11 w-full border-cp-border bg-cp-elevated"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300] border-cp-border bg-cp-card" position="popper">
                  {ACCESS_GRANT_ROLES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole ? (
                <p className="text-xs leading-relaxed text-cp-muted">{selectedRole.description}</p>
              ) : null}
            </div>

            <Button
              type="button"
              className="h-11 w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto sm:min-w-[220px]"
              disabled={createInvite.isPending}
              onClick={() => void handleCreate()}
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
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-red-950/20">
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error instanceof Error ? error.message : "Could not load staff invites."}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-cp-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading staff invites…
          </div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Active invite links ({activeInviteLinks.length})
              </h4>
              {activeInviteLinks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
                  No active staff invites. Generate one above and share the link or code.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeInviteLinks.map((inv) => (
                    <TournamentInviteListItem
                      key={inv.id}
                      title={getAccessGrantRoleLabel(inv.role)}
                      subtitle={`Reusable by anyone · max ${INVITE_HOST_COPY.validityDays} days`}
                      status={inv.status}
                      expiresAt={inv.expiresAt ?? undefined}
                      inviteUrl={inv.inviteUrl}
                      inviteCode={inv.inviteCode}
                      onViewDetails={() => handleViewDetails(inv)}
                      onRemove={() => void handleRemove(inv)}
                      removing={revokeInvite.isPending}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cp-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  Active staff ({activeStaff.length})
                </h4>
              </div>
              {activeStaff.length === 0 ? (
                <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
                  No staff has accepted an invite yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeStaff.map((inv) => (
                    <TournamentInviteListItem
                      key={inv.id}
                      title={getAccessGrantRoleLabel(inv.role)}
                      subtitle="Accepted via invite"
                      status={inv.status}
                      expiresAt={inv.expiresAt ?? undefined}
                      redeemedUserName={inv.redeemedUserName}
                      redeemedUserImage={inv.redeemedUserImage}
                      onRemove={() => void handleRemove(inv)}
                      removing={revokeInvite.isPending}
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
      />
    </>
  );
}
