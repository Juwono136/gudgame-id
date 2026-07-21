"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Play } from "lucide-react";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
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
import {
  buildActiveCourtLockState,
  isTeamLockedForCourt,
  teamLockReason,
} from "@/lib/tournaments/reclub/active-court-lock";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { cn } from "@/lib/utils";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
  cpStatusAmberClass,
} from "@/lib/styles/surface-classes";

function useLiveTimer(startedAt: string | null, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);
  return elapsed;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type ManageCourtCardProps = {
  court: { id: string; name: string; courtNumber: number };
  match: ReclubMatchView | null;
  teams: LobbyTeamView[];
  activeMatches: ReclubMatchView[];
  canScore: boolean;
  teamAId: string;
  teamBId: string;
  onTeamAChange: (v: string) => void;
  onTeamBChange: (v: string) => void;
  onStart: () => void;
  starting: boolean;
  busy: boolean;
  pointsPerMatch: number;
  scoringType: string;
  roundDuration: number;
  editingName: boolean;
  nameDraft: string;
  onEditName: () => void;
  onNameDraftChange: (v: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onScoreChange: (input: {
    scoreA: number;
    scoreB: number;
    action?: "increment" | "decrement" | "set";
    side?: "a" | "b";
  }) => void;
  onComplete: (elapsed: number) => void;
  completing: boolean;
};

export const ManageCourtCard = memo(function ManageCourtCard({
  court,
  match,
  teams,
  activeMatches,
  canScore,
  teamAId,
  teamBId,
  onTeamAChange,
  onTeamBChange,
  onStart,
  starting,
  busy,
  pointsPerMatch,
  scoringType,
  roundDuration,
  editingName,
  nameDraft,
  onEditName,
  onNameDraftChange,
  onSaveName,
  onCancelEdit,
  onScoreChange,
  onComplete,
  completing,
}: ManageCourtCardProps) {
  const elapsed = useLiveTimer(match?.startedAt ?? null, Boolean(match));
  const [localScoreA, setLocalScoreA] = useState(match?.scoreA ?? 0);
  const [localScoreB, setLocalScoreB] = useState(match?.scoreB ?? 0);
  const scoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const localScoreRef = useRef({ a: match?.scoreA ?? 0, b: match?.scoreB ?? 0 });

  useEffect(() => {
    if (!match) {
      dirtyRef.current = false;
      setLocalScoreA(0);
      setLocalScoreB(0);
      localScoreRef.current = { a: 0, b: 0 };
      return;
    }
    const serverA = match.scoreA ?? 0;
    const serverB = match.scoreB ?? 0;
    if (dirtyRef.current) {
      if (localScoreRef.current.a === serverA && localScoreRef.current.b === serverB) {
        dirtyRef.current = false;
      }
      return;
    }
    setLocalScoreA(serverA);
    setLocalScoreB(serverB);
    localScoreRef.current = { a: serverA, b: serverB };
  }, [match, match?.id, match?.scoreA, match?.scoreB]);

  useEffect(
    () => () => {
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
    },
    [],
  );

  const courtLock = useMemo(
    () => buildActiveCourtLockState(activeMatches.filter((m) => m.courtId !== court.id), teams),
    [activeMatches, court.id, teams],
  );

  const teamOptions = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  const pushScore = useCallback(
    (
      nextA: number,
      nextB: number,
      action?: "increment" | "decrement" | "set",
      side?: "a" | "b",
    ) => {
      dirtyRef.current = true;
      localScoreRef.current = { a: nextA, b: nextB };
      setLocalScoreA(nextA);
      setLocalScoreB(nextB);
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
      scoreSyncRef.current = setTimeout(() => {
        onScoreChange({ scoreA: nextA, scoreB: nextB, action: "set", side });
      }, 120);
    },
    [onScoreChange],
  );

  const timerRemaining =
    match?.timerEndsAt && scoringType === "timed"
      ? Math.max(0, Math.floor((new Date(match.timerEndsAt).getTime() - Date.now()) / 1000))
      : null;

  return (
    <article
      className={cn(
        "flex h-full min-h-[17rem] min-w-0 flex-col rounded-2xl border bg-cp-card p-3 sm:min-h-[18rem] sm:p-4",
        match ? "border-cp-primary/40 ring-1 ring-cp-primary/20" : "border-cp-border",
      )}
    >
      <div className="mb-3 flex shrink-0 items-center gap-2 border-b border-cp-border pb-3">
        {editingName ? (
          <div className="flex w-full flex-col gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => onNameDraftChange(e.target.value)}
              className="h-9 border-cp-border bg-cp-elevated/50"
              placeholder="Court name"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" className="flex-1 sm:flex-none" onClick={onSaveName}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-foreground sm:text-base">
              {court.name}
            </h3>
            {canScore ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 text-cp-muted hover:text-foreground"
                onClick={onEditName}
                aria-label={`Rename ${court.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                match
                  ? "bg-red-500/15 text-red-400"
                  : busy
                    ? cpStatusAmberClass
                    : "bg-cp-elevated text-cp-muted",
              )}
            >
              {match ? "Live" : busy ? "Busy" : "Idle"}
            </span>
          </>
        )}
      </div>

      {match ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {timerRemaining != null ? (
            <div className="h-1 overflow-hidden rounded-full bg-cp-elevated">
              <div
                className="h-full bg-cp-primary transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((roundDuration * 60 - timerRemaining) / (roundDuration * 60)) * 100)}%`,
                }}
              />
            </div>
          ) : null}
          <LiveScoreboard
            variant="compact"
            teamAName={match.teamAName ?? "Team A"}
            teamBName={match.teamBName ?? "Team B"}
            teamAPlayers={
              teams
                .find((t) => t.id === match.teamAId)
                ?.members?.map((m) => m.displayName)
                .filter(Boolean) as string[] | undefined
            }
            teamBPlayers={
              teams
                .find((t) => t.id === match.teamBId)
                ?.members?.map((m) => m.displayName)
                .filter(Boolean) as string[] | undefined
            }
            scoreA={localScoreA}
            scoreB={localScoreB}
            maxScore={pointsPerMatch}
            disabled={!canScore}
            onScoreAChange={(v) => {
              const b = localScoreRef.current.b;
              pushScore(v, b, "set", "a");
            }}
            onScoreBChange={(v) => {
              const a = localScoreRef.current.a;
              pushScore(a, v, "set", "b");
            }}
          />
          <div className="mt-auto flex flex-col gap-2 border-t border-cp-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-center text-xs tabular-nums text-cp-muted sm:text-left">
              {formatDuration(elapsed)}
            </span>
            {canScore ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={completing}
                onClick={() => onComplete(elapsed)}
              >
                Finish
              </Button>
            ) : null}
          </div>
        </div>
      ) : canScore && !busy ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-cp-muted">Team A</Label>
            <Select
              value={teamAId || "__none__"}
              onValueChange={(v) => onTeamAChange(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full min-w-0")}>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="__none__" className={cpSelectItemClass}>
                  Select team…
                </SelectItem>
                {teamOptions.map((t) => {
                  const locked = isTeamLockedForCourt(t.id, courtLock, teams);
                  const reason = teamLockReason(t.id, courtLock, teams);
                  return (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      disabled={locked || t.id === teamBId}
                      className={cpSelectItemClass}
                      title={reason ?? undefined}
                    >
                      {t.name}
                      {locked ? " (on court)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-cp-muted">Team B</Label>
            <Select
              value={teamBId || "__none__"}
              onValueChange={(v) => onTeamBChange(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full min-w-0")}>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="__none__" className={cpSelectItemClass}>
                  Select team…
                </SelectItem>
                {teamOptions.map((t) => {
                  const locked = isTeamLockedForCourt(t.id, courtLock, teams);
                  const reason = teamLockReason(t.id, courtLock, teams);
                  return (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      disabled={locked || t.id === teamAId}
                      className={cpSelectItemClass}
                      title={reason ?? undefined}
                    >
                      {t.name}
                      {locked ? " (on court)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="mt-auto h-10 w-full"
            disabled={starting || !teamAId || !teamBId}
            onClick={onStart}
          >
            {starting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Start on court
          </Button>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-cp-muted">No active match</p>
      )}
    </article>
  );
});
