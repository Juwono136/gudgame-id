"use client";

import { useMemo } from "react";
import { Loader2, UserMinus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import { useRemoveTournamentParticipant } from "@/hooks/use-tournament-manage-display";
import { usePlayerInvites } from "@/hooks/use-tournament-invites";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type ManagePlayerRosterPanelProps = {
  sportSlug: string;
  slug: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ManagePlayerRosterPanel({ sportSlug, slug }: ManagePlayerRosterPanelProps) {
  const { confirm } = useConfirmDialog();
  const { data: participants, isLoading: loadingPlayers } = useTournamentParticipants(
    sportSlug,
    slug,
    1,
    100,
  );
  const { data: invites, isLoading: loadingInvites } = usePlayerInvites(sportSlug, slug);
  const removePlayer = useRemoveTournamentParticipant(sportSlug, slug);

  const acceptedFromInvites = useMemo(
    () => (invites ?? []).filter((inv) => inv.status === "accepted" && inv.redeemedByUserId),
    [invites],
  );

  const handleRemove = async (userId: string, displayName: string) => {
    const ok = await confirm({
      title: `Remove ${displayName}?`,
      description:
        "They will lose access to this tournament and be removed from their squad. You can send a new invite later.",
      confirmLabel: "Remove player",
      variant: "destructive",
    });
    if (!ok) return;
    await removePlayer.mutateAsync(userId);
  };

  if (loadingPlayers || loadingInvites) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner label="Loading roster…" />
      </div>
    );
  }

  const items = participants?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-cp-primary" />
        <h3 className="text-sm font-semibold text-foreground">Joined players</h3>
        <Badge variant="muted" className="ml-auto">
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cp-border px-4 py-8 text-center text-sm text-cp-muted">
          No players have joined yet.
        </p>
      ) : (
        <ul className="divide-y divide-cp-border rounded-xl border border-cp-border bg-cp-elevated/20">
          {items.map((row) => (
            <li
              key={row.userId}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 border border-cp-border">
                  <AvatarImage src={row.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-cp-elevated text-xs">
                    {initials(row.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{row.displayName}</p>
                  <p className="truncate text-xs text-cp-muted">
                    {row.teamName} · <span className="capitalize">{row.role}</span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                disabled={removePlayer.isPending}
                onClick={() => void handleRemove(row.userId, row.displayName)}
              >
                {removePlayer.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {acceptedFromInvites.length > 0 ? (
        <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/10 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-cp-muted">
            Recent invite acceptances
          </p>
          <ul className="mt-2 space-y-1">
            {acceptedFromInvites.map((inv) => (
              <li key={inv.id} className="text-sm text-cp-muted">
                <span className="text-foreground">{inv.redeemedByName ?? "Player"}</span>
                {inv.redeemedAt ? (
                  <span className="text-xs">
                    {" "}
                    · joined{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                      new Date(inv.redeemedAt),
                    )}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
