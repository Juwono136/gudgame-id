"use client";

import { useMemo, useState } from "react";
import { Shuffle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHostMovePlayer } from "@/hooks/use-tournament-lobby";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";

type FunMatchHostToolsProps = {
  sportSlug: string;
  slug: string;
  teams: LobbyTeamView[];
  activeReclubMatches?: ReclubMatchView[];
  activeBracketMatches?: BracketMatchView[];
  canManage: boolean;
  onReshuffle?: () => void;
  onMoved?: () => void;
  showReshuffle?: boolean;
};

export function FunMatchHostTools({
  sportSlug,
  slug,
  teams,
  activeReclubMatches = [],
  activeBracketMatches = [],
  canManage,
  onReshuffle,
  onMoved,
  showReshuffle = true,
}: FunMatchHostToolsProps) {
  const movePlayer = useHostMovePlayer(sportSlug, slug);
  const [movePlayerId, setMovePlayerId] = useState("");
  const [moveTargetTeamId, setMoveTargetTeamId] = useState("");

  const liveTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of activeReclubMatches) {
      if (m.teamAId) ids.add(m.teamAId);
      if (m.teamBId) ids.add(m.teamBId);
    }
    for (const m of activeBracketMatches) {
      if (m.teamAId) ids.add(m.teamAId);
      if (m.teamBId) ids.add(m.teamBId);
    }
    return ids;
  }, [activeBracketMatches, activeReclubMatches]);

  const allPlayers = useMemo(
    () =>
      teams.flatMap((t) =>
        (t.members ?? []).map((m) => ({
          id: m.userId,
          name: m.displayName ?? "Player",
          teamId: t.id,
          teamName: t.name,
          onLiveCourt: liveTeamIds.has(t.id),
        })),
      ),
    [liveTeamIds, teams],
  );

  const squadsWithPlayers = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  const handleMovePlayer = async () => {
    if (!movePlayerId || !moveTargetTeamId) return;
    await movePlayer.mutateAsync({ userId: movePlayerId, teamId: moveTargetTeamId });
    setMovePlayerId("");
    setMoveTargetTeamId("");
    onMoved?.();
  };

  if (!canManage) return null;

  return (
    <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-emerald-400" />
            Squad tools
          </h3>
          <p className="mt-1 text-xs text-cp-muted">
            Reshuffle idle courts or move a player between squads. Players on a live court cannot be
            moved.
          </p>
        </div>
        {showReshuffle && onReshuffle ? (
          <Button type="button" variant="outline" size="sm" onClick={onReshuffle}>
            <Shuffle className="mr-1.5 h-4 w-4" />
            Reshuffle courts
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Select
          value={movePlayerId || "__none__"}
          onValueChange={(v) => setMovePlayerId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className={cpSelectTriggerClass}>
            <SelectValue placeholder="Player" />
          </SelectTrigger>
          <SelectContent className={cpSelectContentClass}>
            <SelectItem value="__none__" className={cpSelectItemClass}>
              Select player
            </SelectItem>
            {allPlayers.map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                className={cpSelectItemClass}
                disabled={p.onLiveCourt}
              >
                {p.name} · {p.teamName}
                {p.onLiveCourt ? " (live)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={moveTargetTeamId || "__none__"}
          onValueChange={(v) => setMoveTargetTeamId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className={cpSelectTriggerClass}>
            <SelectValue placeholder="Target squad" />
          </SelectTrigger>
          <SelectContent className={cpSelectContentClass}>
            <SelectItem value="__none__" className={cpSelectItemClass}>
              Select squad
            </SelectItem>
            {squadsWithPlayers.map((t) => (
              <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500"
          disabled={!movePlayerId || !moveTargetTeamId || movePlayer.isPending}
          onClick={() => void handleMovePlayer()}
        >
          Move player
        </Button>
      </div>
    </div>
  );
}
