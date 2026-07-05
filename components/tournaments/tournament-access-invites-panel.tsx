"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { data: invites, isLoading, isError, error, refetch } = useAccessInvites(
    sportSlug,
    slug,
    enabled,
  );
  const createInvite = useCreateAccessInvite(sportSlug, slug);
  const revealInvite = useRevealAccessInvite(sportSlug, slug);
  const revokeInvite = useRevokeAccessInvite(sportSlug, slug);
  const [role, setRole] = useState<"scorekeeper" | "bracket_manager">("scorekeeper");
  const [staffEmail, setStaffEmail] = useState("");
  const [createdInvite, setCreatedInvite] = useState<AccessInviteView | null>(null);
  const [detailsInvite, setDetailsInvite] = useState<InviteDetailsState | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const activeInvites = useMemo(
    () => (invites ?? []).filter((inv) => isActiveInviteStatus(inv.status)),
    [invites],
  );

  const pendingInvites = useMemo(
    () => activeInvites.filter((inv) => inv.status === "pending"),
    [activeInvites],
  );

  const activeStaff = useMemo(
    () => activeInvites.filter((inv) => inv.status === "accepted"),
    [activeInvites],
  );

  const selectedRole = ACCESS_GRANT_ROLES.find((r) => r.value === role);

  const handleCreate = async () => {
    const ok = await confirm({
      title: "Generate staff invite?",
      description: `Create a ${selectedRole?.label ?? role} invite. Share the link or code only with trusted people — they will gain access to this tournament's manage workspace.`,
      confirmLabel: "Generate invite",
    });
    if (!ok) return;

    const email = staffEmail.trim().toLowerCase();
    createInvite.mutate(
      { role, email: email || undefined },
      {
        onSuccess: (invite) => {
          setCreatedInvite(invite);
          setStaffEmail("");
        },
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
              Invite trusted people to help score matches or manage the bracket. Only the tournament
              organizer can create or revoke staff invites.
            </p>
          </div>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-cp-primary/20 bg-cp-primary/5 p-3 sm:p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed text-cp-muted">
            <p className="font-medium text-foreground">Secure staff access</p>
            <p className="mt-1">
              Each invite uses a one-time link and rotating code. Staff must sign in and accept before
              access is granted. Platform admins cannot access your tournament unless you invite them.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-elevated/20 p-4">
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="staff-email">
                  Staff email <span className="font-normal text-cp-muted">(optional)</span>
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="name@example.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="h-11 border-cp-border bg-cp-elevated"
                />
                <p className="text-xs text-cp-muted">
                  For your records only — staff still accepts via link or code while signed in.
                </p>
              </div>
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
          <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-red-200">
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
                      subtitle={inv.email ?? "Shared via invite link"}
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

            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Pending invites ({pendingInvites.length})
              </h4>
              {pendingInvites.length === 0 ? (
                <p className="rounded-lg border border-dashed border-cp-border/80 px-3 py-3 text-xs text-cp-muted">
                  No pending invites. Generate one above and share the link or code with your staff.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pendingInvites.map((inv) => (
                    <TournamentInviteListItem
                      key={inv.id}
                      title={getAccessGrantRoleLabel(inv.role)}
                      subtitle={inv.email ?? "Shared via link or code"}
                      status={inv.status}
                      expiresAt={inv.expiresAt ?? undefined}
                      inviteUrl={inv.inviteUrl}
                      onViewDetails={() => handleViewDetails(inv)}
                      viewingDetails={revealingId === inv.id}
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
        rotateNotice="Opening details refreshes the link and code. Share the updated credentials with your staff member."
      />
    </>
  );
}
