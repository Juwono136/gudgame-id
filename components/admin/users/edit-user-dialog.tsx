"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateAdminUser } from "@/hooks/use-admin-users";
import { invalidateSessionContext } from "@/lib/session/invalidate-session-context";
import { APP_ROLES, getRoleLabel, type AppRole } from "@/lib/roles/constants";
import type { AdminUserListItem } from "@/lib/admin/users/service";
import { resolveUserImageUrl } from "@/lib/media/client";
import { getProfileHandle } from "@/lib/auth/user-display";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserListItem | null;
  canAssignSuperAdmin: boolean;
  currentUserId: string;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-cp-border/60 bg-cp-bg/40 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
        {label}
      </dt>
      <dd className="break-all text-sm leading-snug text-foreground">{value}</dd>
    </div>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  canAssignSuperAdmin,
  currentUserId,
}: EditUserDialogProps) {
  const { confirm } = useConfirmDialog();
  const qc = useQueryClient();
  const updateUser = useUpdateAdminUser();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    setRoles(user.roles);
    setIsActive(user.isActive);
  }, [open, user]);

  const availableRoles = APP_ROLES.filter(
    (r) => r !== "super_admin" || canAssignSuperAdmin,
  );

  const toggleRole = (role: AppRole) => {
    setRoles((current) => {
      if (current.includes(role)) {
        if (current.length === 1) return current;
        return current.filter((r) => r !== role);
      }
      return [...current, role];
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (roles.length === 0) {
      toast.error("Select at least one role");
      return;
    }
    if (user.id === currentUserId && !isActive) {
      toast.error("You cannot deactivate your own account");
      return;
    }

    const ok = await confirm({
      title: "Save user changes?",
      description: `Update roles and status for ${user.name}.`,
      confirmLabel: "Save changes",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { roles, isActive },
      });
      toast.success("User updated");
      invalidateSessionContext(qc);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (!user) return null;

  const avatarSrc = resolveUserImageUrl(user.image);
  const handle = getProfileHandle({
    nickname: user.nickname,
    email: user.email,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,800px)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-cp-border px-5 py-4 pr-12 text-left">
          <DialogTitle>Edit user access</DialogTitle>
          <DialogDescription>
            View profile details below. You can change roles and activate or deactivate
            this account.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-3">
            <Avatar className="h-14 w-14 shrink-0 border border-cp-border">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.name} /> : null}
              <AvatarFallback className="bg-cp-primary/15 text-sm font-semibold text-cp-primary">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-cp-logo-accent">
                {handle.isNickname ? `@${handle.handle}` : user.email}
              </p>
            </div>
          </div>

          <dl className="grid gap-2 sm:grid-cols-2">
            <InfoRow label="Full name" value={user.name} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="Nickname"
              value={user.nickname ? `@${user.nickname}` : "—"}
            />
            <InfoRow
              label="Phone"
              value={
                user.phone
                  ? `${user.phoneCountryCode ?? ""} ${user.phone}`.trim()
                  : "—"
              }
            />
            <InfoRow
              label="Player tier"
              value={`${user.playerTier} · ${user.careerPoints.toLocaleString("en-US")} career pts`}
            />
            <InfoRow
              label="Email verified"
              value={user.emailVerified ? "Yes" : "No"}
            />
            <InfoRow label="Joined" value={formatDateTime(user.createdAt)} />
            <InfoRow
              label="Last login"
              value={formatDateTime(user.lastLoginAt)}
            />
          </dl>

          <div className="mt-5 space-y-3 border-t border-cp-border pt-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Assign roles</Label>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => {
                  const selected = roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                        selected
                          ? "border-cp-primary bg-cp-primary/20 text-cp-logo-accent"
                          : "border-cp-border text-cp-muted hover:border-cp-primary/40",
                      )}
                    >
                      {getRoleLabel(role)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Account status</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                    isActive ? statusBadgeClass.success : "border-cp-border text-cp-muted hover:text-foreground",
                  )}
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (user.id === currentUserId) return;
                    setIsActive(false);
                  }}
                  disabled={user.id === currentUserId}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                    !isActive
                      ? "border-red-500/50 bg-red-500/15 text-red-300"
                      : "border-cp-border text-cp-muted hover:text-foreground",
                    user.id === currentUserId && "cursor-not-allowed opacity-50",
                  )}
                >
                  Deactivate
                </button>
              </div>
              {user.id === currentUserId ? (
                <p className="text-xs text-cp-muted">
                  You cannot deactivate your own account.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-cp-border bg-cp-card/80 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full border-cp-border sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={updateUser.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void handleSave()}
            disabled={updateUser.isPending}
          >
            {updateUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
