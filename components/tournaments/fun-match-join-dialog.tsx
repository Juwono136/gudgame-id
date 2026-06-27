"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage, type ApiErrorBody } from "@/lib/api/extract-api-error";
import { useQueryClient } from "@tanstack/react-query";
import { useTournamentLobby } from "@/hooks/use-tournament-lobby";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";
import { cn } from "@/lib/utils";

type SquadOption = {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
};

type FunMatchJoinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportSlug: string;
  slug: string;
  squads?: SquadOption[];
  playersPerTeam?: number;
  maxTeams?: number | null;
  preselectedTeamId?: string | null;
  userAlreadyInSquad?: boolean;
  onJoined?: () => void;
};

function toSquadOptions(
  teams: { id: string; name: string; memberCount: number }[],
  playersPerTeam: number,
): SquadOption[] {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    memberCount: team.memberCount,
    maxMembers: playersPerTeam,
  }));
}

export function FunMatchJoinDialog({
  open,
  onOpenChange,
  sportSlug,
  slug,
  squads: squadsProp = [],
  playersPerTeam: playersPerTeamProp = 2,
  maxTeams: maxTeamsProp = null,
  preselectedTeamId,
  userAlreadyInSquad = false,
  onJoined,
}: FunMatchJoinDialogProps) {
  const qc = useQueryClient();
  const { data: lobbyData, refetch, isFetching } = useTournamentLobby(sportSlug, slug);

  const playersPerTeam =
    lobbyData?.tournament.playersPerTeam ?? playersPerTeamProp;
  const maxTeams = lobbyData?.tournament.maxTeams ?? maxTeamsProp;

  const squads = useMemo(() => {
    if (lobbyData?.teams?.length) {
      return toSquadOptions(lobbyData.teams, playersPerTeam);
    }
    return squadsProp;
  }, [lobbyData?.teams, playersPerTeam, squadsProp]);

  const joinableSquads = useMemo(
    () => squads.filter((s) => s.memberCount < s.maxMembers),
    [squads],
  );
  const hasJoinableSquads = joinableSquads.length > 0;
  const canCreateSquad =
    maxTeams == null || maxTeams <= 0 || squads.length < maxTeams;

  const [mode, setMode] = useState<"join_squad" | "create_squad">("create_squad");
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (open) {
      void refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (
      preselectedTeamId &&
      joinableSquads.some((s) => s.id === preselectedTeamId)
    ) {
      setMode("join_squad");
      setTeamId(preselectedTeamId);
      return;
    }

    if (hasJoinableSquads && !userAlreadyInSquad) {
      setMode("join_squad");
      setTeamId(joinableSquads[0]?.id ?? "");
      return;
    }

    if (canCreateSquad) {
      setMode("create_squad");
      setTeamId("");
    } else if (hasJoinableSquads) {
      setMode("join_squad");
      setTeamId(joinableSquads[0]?.id ?? "");
    }
  }, [
    open,
    preselectedTeamId,
    canCreateSquad,
    hasJoinableSquads,
    joinableSquads,
    userAlreadyInSquad,
  ]);

  const squadLimitLabel =
    maxTeams != null && maxTeams > 0
      ? `${squads.length} / ${maxTeams} squads`
      : null;

  const handleJoin = async () => {
    setSubmitting(true);
    try {
      if (mode === "create_squad") {
        if (!canCreateSquad) {
          toast.error(
            maxTeams != null
              ? `Maximum squad limit reached (${maxTeams})`
              : "Cannot create a new squad right now",
          );
          setSubmitting(false);
          return;
        }
        if (teamName.trim().length < 2) {
          toast.error("Enter a squad name (min 2 characters)");
          setSubmitting(false);
          return;
        }
        const normalizedName = teamName.trim().toLowerCase();
        if (squads.some((s) => s.name.trim().toLowerCase() === normalizedName)) {
          toast.error("A squad with this name already exists");
          setSubmitting(false);
          return;
        }
      }

      if (mode === "join_squad") {
        if (!hasJoinableSquads) {
          toast.error("No squads with open slots right now");
          setSubmitting(false);
          return;
        }
        if (!teamId) {
          toast.error("Select a squad to join");
          setSubmitting(false);
          return;
        }
      }

      const body =
        mode === "join_squad"
          ? { mode: "join_squad" as const, teamId }
          : { mode: "create_squad" as const, teamName: teamName.trim() };

      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseJsonResponse<{ success: boolean; data?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json as ApiErrorBody, "Could not join session"));
      }

      toast.success(
        mode === "create_squad"
          ? userAlreadyInSquad
            ? "Squad created"
            : "Squad created — you're in"
          : "Joined squad",
      );
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.lobby(sportSlug, slug) });
      void qc.invalidateQueries({ queryKey: tournamentQueryKeys.live(sportSlug, slug) });
      onOpenChange(false);
      onJoined?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Join failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto border-cp-border bg-cp-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Join Fun Match</DialogTitle>
          <DialogDescription>
            Create a new squad or join one with open slots.
            {squadLimitLabel ? ` ${squadLimitLabel} in this session.` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("join_squad")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                mode === "join_squad"
                  ? "border-cp-primary bg-cp-primary/10"
                  : "border-cp-border bg-cp-elevated hover:border-cp-primary/40",
              )}
            >
              <p className="text-sm font-semibold text-foreground">Join squad</p>
              <p className="mt-0.5 text-xs text-cp-muted">
                {hasJoinableSquads
                  ? `${joinableSquads.length} squad${joinableSquads.length === 1 ? "" : "s"} open`
                  : "No open slots"}
              </p>
            </button>
            <button
              type="button"
              disabled={!canCreateSquad}
              onClick={() => setMode("create_squad")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                mode === "create_squad"
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-cp-border bg-cp-elevated hover:border-emerald-500/40",
                !canCreateSquad && "cursor-not-allowed opacity-50",
              )}
            >
              <p className="text-sm font-semibold text-foreground">Create squad</p>
              <p className="mt-0.5 text-xs text-cp-muted">
                {canCreateSquad
                  ? "Start a new team"
                  : maxTeams != null
                    ? `Limit reached (${maxTeams})`
                    : "Unavailable"}
              </p>
            </button>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground">Current squads</Label>
              {isFetching ? (
                <span className="text-[11px] text-cp-muted">Refreshing…</span>
              ) : null}
            </div>

            {squads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-5 text-center">
                <Users className="mx-auto h-7 w-7 text-cp-muted" />
                <p className="mt-2 text-sm text-cp-muted">No squads yet — be the first to create one.</p>
              </div>
            ) : (
              <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {squads.map((squad) => {
                  const isFull = squad.memberCount >= squad.maxMembers;
                  const isOpen = !isFull;
                  const isSelected = mode === "join_squad" && teamId === squad.id;
                  const canSelect = mode === "join_squad" && isOpen;

                  return (
                    <li key={squad.id}>
                      <button
                        type="button"
                        disabled={!canSelect}
                        onClick={() => {
                          if (!canSelect) return;
                          setTeamId(squad.id);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          isSelected
                            ? "border-cp-primary bg-cp-primary/10"
                            : "border-cp-border bg-cp-elevated/40",
                          canSelect && !isSelected && "hover:border-cp-primary/40",
                          !canSelect && "cursor-default opacity-80",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{squad.name}</p>
                          <p className="text-xs text-cp-muted">
                            {squad.memberCount}/{squad.maxMembers} players
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={isOpen ? "success" : "muted"}>
                            {isOpen ? (squad.memberCount === 0 ? "Empty" : "Open") : "Full"}
                          </Badge>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-cp-primary" />
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {mode === "join_squad" && squads.length > 0 && !hasJoinableSquads ? (
              <p className="text-xs text-amber-300/90">
                All squads are full. Create a new squad if the session limit allows.
              </p>
            ) : null}
          </section>

          {mode === "create_squad" ? (
            <div className="space-y-2 border-t border-cp-border pt-4">
              <Label htmlFor="teamName">New squad name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Sunday Smashers"
                className="border-cp-border bg-cp-elevated"
                maxLength={120}
              />
              <p className="text-xs text-cp-muted">
                {userAlreadyInSquad
                  ? "You stay in your current squad. The new squad opens for others to join."
                  : "You will be added as the first member of this squad."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-cp-muted">
              Select an open squad above, then confirm with Join squad.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              submitting ||
              (mode === "join_squad" && (!hasJoinableSquads || !teamId)) ||
              (mode === "create_squad" && !canCreateSquad)
            }
            onClick={() => void handleJoin()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Working…
              </>
            ) : mode === "create_squad" ? (
              userAlreadyInSquad ? "Create squad" : "Create & join"
            ) : (
              "Join squad"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
