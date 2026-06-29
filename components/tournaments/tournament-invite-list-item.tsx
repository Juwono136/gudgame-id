"use client";

import { Copy, Eye, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getInviteStatusLabel,
  isActiveInviteStatus,
} from "@/lib/tournaments/invitations/invite-ui";
import { cn } from "@/lib/utils";

type TournamentInviteListItemProps = {
  title: string;
  subtitle?: string | null;
  status: string;
  expiresAt?: string;
  inviteUrl?: string;
  redeemedUserName?: string | null;
  redeemedUserImage?: string | null;
  onViewDetails?: () => void;
  viewingDetails?: boolean;
  onRemove?: () => void;
  removing?: boolean;
  className?: string;
};

function formatExpiry(iso?: string) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return null;
  }
}

function statusVariant(status: string): "success" | "warning" | "muted" {
  if (status === "accepted") return "success";
  if (status === "pending") return "warning";
  return "muted";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TournamentInviteListItem({
  title,
  subtitle,
  status,
  expiresAt,
  inviteUrl,
  redeemedUserName,
  redeemedUserImage,
  onViewDetails,
  viewingDetails,
  onRemove,
  removing,
  className,
}: TournamentInviteListItemProps) {
  if (!isActiveInviteStatus(status)) return null;

  const expiryLabel = formatExpiry(expiresAt);
  const canRemove = Boolean(onRemove);
  const canCopy = status === "pending" && Boolean(inviteUrl);
  const canViewDetails = status === "pending" && Boolean(onViewDetails);

  const copyLink = async () => {
    if (!inviteUrl) {
      toast.error("Invite link is not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-cp-border/80 bg-cp-bg/40 p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium capitalize text-foreground">{title}</p>
          <Badge variant={statusVariant(status)}>{getInviteStatusLabel(status)}</Badge>
        </div>
        {subtitle ? <p className="mt-0.5 text-xs text-cp-muted">{subtitle}</p> : null}
        {expiryLabel && status === "pending" ? (
          <p className="mt-1 text-[11px] text-cp-text-dim">Valid until {expiryLabel}</p>
        ) : null}
        {status === "accepted" && redeemedUserName ? (
          <div className="mt-2 flex items-center gap-2">
            <Avatar className="h-7 w-7 border border-cp-border">
              <AvatarImage src={redeemedUserImage ?? undefined} alt="" />
              <AvatarFallback className="bg-cp-elevated text-[10px]">
                {initials(redeemedUserName)}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-emerald-400/90">
              Accepted by <span className="font-medium text-foreground">{redeemedUserName}</span>
            </p>
          </div>
        ) : status === "accepted" ? (
          <p className="mt-1 text-[11px] text-emerald-400/90">Redeemed — access is active</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        {canViewDetails ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full sm:w-auto"
            disabled={viewingDetails}
            onClick={onViewDetails}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View details
          </Button>
        ) : null}
        {canCopy ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full sm:w-auto"
            onClick={() => void copyLink()}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy link
          </Button>
        ) : null}
        {canRemove ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 sm:w-auto"
            disabled={removing}
            onClick={onRemove}
            title={status === "accepted" ? "Revoke staff access" : "Remove this invite"}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            {status === "accepted" ? "Revoke" : "Remove"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
