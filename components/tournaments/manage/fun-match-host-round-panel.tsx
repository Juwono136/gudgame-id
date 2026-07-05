"use client";

import { useMemo, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStartReclubRound } from "@/hooks/use-tournament-lobby";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
  cpFunHostPanelClass,
  cpAlertWarningInlineTextClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type FunMatchHostRoundPanelProps = {
  sportSlug: string;
  slug: string;
  teams: LobbyTeamView[];
  maxRounds: number | null;
  completedRounds: number;
  hasActiveMatch: boolean;
  livePhase: string;
  teamsInActiveBracket?: Set<string>;
  canUseHostControls?: boolean;
  className?: string;
};

export function FunMatchHostRoundPanel({
  sportSlug,
  slug,
  teams,
  maxRounds,
  completedRounds,
  hasActiveMatch,
  livePhase,
  teamsInActiveBracket = new Set(),
  canUseHostControls = true,
  className,
}: FunMatchHostRoundPanelProps) {
  const { confirm } = useConfirmDialog();
  const startRound = useStartReclubRound(sportSlug, slug);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");

  const teamOptions = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  const roundsRemaining =
    maxRounds != null
      ? Math.max(0, maxRounds - completedRounds - (hasActiveMatch ? 1 : 0))
      : null;

  if (!canUseHostControls || livePhase !== "live" || hasActiveMatch || teamOptions.length < 2) {
    return null;
  }

  const handleStart = async () => {
    if (!teamAId || !teamBId) {
      toast.error("Select two squads");
      return;
    }
    if (teamAId === teamBId) {
      toast.error("Select two different squads");
      return;
    }
    const ok = await confirm({
      title: "Start lobby round?",
      description: "Squads lock until the round is finalized.",
      confirmLabel: "Start round",
    });
    if (!ok) return;
    startRound.mutate(
      { teamAId, teamBId },
      {
        onSuccess: () => {
          setTeamAId("");
          setTeamBId("");
        },
      },
    );
  };

  return (
    <section className={cn(cpFunHostPanelClass, className)}>
      <h3 className="font-semibold text-foreground">Host controls</h3>
      <p className="mt-1 text-sm text-cp-muted">
        Pick two squads and start the next lobby round. For multi-court play, assign teams per court
        below after starting.
        {teamsInActiveBracket.size > 0 ? (
          <span className={cn("mt-1 block", cpAlertWarningInlineTextClass)}>
            Squads in an active bracket match cannot start a lobby round until finalized.
          </span>
        ) : null}
        {maxRounds != null ? (
          <span className="mt-1 block">
            {roundsRemaining === 0
              ? "All rounds for this session have been played."
              : `${roundsRemaining} round${roundsRemaining === 1 ? "" : "s"} remaining of ${maxRounds}.`}
          </span>
        ) : null}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label>Squad A</Label>
          <Select
            value={teamAId || "__none__"}
            onValueChange={(v) => setTeamAId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
              <SelectValue placeholder="Select squad" />
            </SelectTrigger>
            <SelectContent className={cpSelectContentClass} position="popper">
              <SelectItem value="__none__" className={cpSelectItemClass}>
                Select squad…
              </SelectItem>
              {teamOptions.map((t) => (
                <SelectItem
                  key={t.id}
                  value={t.id}
                  disabled={t.id === teamBId || teamsInActiveBracket.has(t.id)}
                  className={cpSelectItemClass}
                >
                  {t.name} ({t.memberCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Squad B</Label>
          <Select
            value={teamBId || "__none__"}
            onValueChange={(v) => setTeamBId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
              <SelectValue placeholder="Select squad" />
            </SelectTrigger>
            <SelectContent className={cpSelectContentClass} position="popper">
              <SelectItem value="__none__" className={cpSelectItemClass}>
                Select squad…
              </SelectItem>
              {teamOptions.map((t) => (
                <SelectItem
                  key={t.id}
                  value={t.id}
                  disabled={t.id === teamAId || teamsInActiveBracket.has(t.id)}
                  className={cpSelectItemClass}
                >
                  {t.name} ({t.memberCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          className="h-11 w-full bg-cp-primary hover:bg-cp-primary-light lg:w-auto"
          disabled={startRound.isPending || roundsRemaining === 0}
          onClick={() => void handleStart()}
        >
          {startRound.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start round
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
