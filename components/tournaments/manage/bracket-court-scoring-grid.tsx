"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Play, RefreshCw, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
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
  useRematchBracketMatch,
  useStartBracketMatchOnCourt,
  useSubmitBracketScore,
  useUpdateBracketLiveScore,
} from "@/hooks/use-tournament-bracket";
import { useStartReclubRound } from "@/hooks/use-tournament-lobby";
import { useRenameTournamentCourt } from "@/hooks/use-tournament-courts";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import {
  bracketMatchLockReason,
  buildBracketCourtLockState,
  isBracketMatchLockedForCourt,
} from "@/lib/tournaments/brackets/active-court-lock";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { TournamentCourtView } from "@/lib/tournaments/courts/service";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { isFunMatchType, isOfficialType } from "@/lib/tournaments/core/types";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
  manageCourtGridClassName,
  cpAlertWarningCompactSurfaceClass,
  cpAlertWarningOutlineButtonClass,
  cpBadgeDangerClass,
  cpBadgeSuccessClass,
  cpEmeraldGhostButtonClass,
  cpStatusAmberClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type BracketCourtScoringGridProps = {
  sportSlug: string;
  slug: string;
  courts: TournamentCourtView[];
  matches: BracketMatchView[];
  teams: LobbyTeamView[];
  participant: TournamentParticipantContext;
  pointsPerMatch: number;
  canScore: boolean;
  tournamentType: string;
  /** Fun-match hybrid: friendly games running alongside bracket matches. */
  reclubActiveMatches?: ReclubMatchView[];
  friendlyAByCourt?: Record<string, string>;
  friendlyBByCourt?: Record<string, string>;
  onFriendlyPickAChange?: (courtId: string, teamId: string) => void;
  onFriendlyPickBChange?: (courtId: string, teamId: string) => void;
  onFriendlyScoreChange?: (
    matchId: string,
    input: {
      scoreA: number;
      scoreB: number;
      action?: "increment" | "decrement" | "set";
      side?: "a" | "b";
    },
  ) => void;
  onFriendlyComplete?: (match: ReclubMatchView, elapsed: number) => void;
  friendlyScoreSyncing?: boolean;
  friendlyCompletePending?: boolean;
  scoringType?: string;
  roundDuration?: number;
};

function formatStartableMatch(m: BracketMatchView): string {
  const base = `R${m.roundNumber} M${m.matchNumber}: ${m.teamAName} vs ${m.teamBName}`;
  if (m.status === "completed") {
    return `${base} (${m.scoreA ?? 0}–${m.scoreB ?? 0} · play again)`;
  }
  return base;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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

function BracketCourtCard({
  court,
  liveMatch,
  friendlyLiveMatch,
  startableMatches,
  pickMatchId,
  onPickMatch,
  friendlyTeamAId,
  friendlyTeamBId,
  onFriendlyTeamAChange,
  onFriendlyTeamBChange,
  onStartFriendly,
  startingFriendly,
  showFriendly,
  onReplayTie,
  replayingTie,
  activeMatches,
  teams,
  onStart,
  starting,
  canScore,
  isOfficial,
  pointsPerMatch,
  scores,
  onPersistScore,
  onFinalize,
  scoreSyncing,
  finalizePending,
  editingName,
  nameDraft,
  onEditName,
  onNameDraftChange,
  onSaveName,
  onCancelEdit,
  reclubActiveMatches,
  onFriendlyScoreChange,
  onFriendlyComplete,
  friendlyScoreSyncing,
  friendlyCompletePending,
  scoringType,
  roundDuration,
}: {
  court: TournamentCourtView;
  liveMatch: BracketMatchView | null;
  friendlyLiveMatch: ReclubMatchView | null;
  startableMatches: BracketMatchView[];
  pickMatchId: string;
  onPickMatch: (matchId: string) => void;
  friendlyTeamAId: string;
  friendlyTeamBId: string;
  onFriendlyTeamAChange: (v: string) => void;
  onFriendlyTeamBChange: (v: string) => void;
  onStartFriendly: () => void;
  startingFriendly: boolean;
  showFriendly: boolean;
  onReplayTie: () => void;
  replayingTie: boolean;
  activeMatches: BracketMatchView[];
  teams: LobbyTeamView[];
  reclubActiveMatches: ReclubMatchView[];
  onStart: () => void;
  starting: boolean;
  canScore: boolean;
  isOfficial: boolean;
  pointsPerMatch: number;
  scores: { a: number; b: number } | null;
  onPersistScore: (
    a: number,
    b: number,
    meta?: {
      action?: "increment" | "decrement" | "set";
      side?: "a" | "b";
      scorerName?: string;
      scorerUserId?: string;
    },
  ) => void;
  onFinalize: () => void;
  scoreSyncing: boolean;
  finalizePending: boolean;
  editingName: boolean;
  nameDraft: string;
  onEditName: () => void;
  onNameDraftChange: (v: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onFriendlyScoreChange: (input: {
    scoreA: number;
    scoreB: number;
    action?: "increment" | "decrement" | "set";
    side?: "a" | "b";
  }) => void;
  onFriendlyComplete: (elapsed: number) => void;
  friendlyScoreSyncing: boolean;
  friendlyCompletePending: boolean;
  scoringType: string;
  roundDuration: number;
}) {
  const elapsed = useLiveTimer(liveMatch?.startedAt ?? null, Boolean(liveMatch));
  const friendlyElapsed = useLiveTimer(
    friendlyLiveMatch?.startedAt ?? null,
    Boolean(friendlyLiveMatch && !liveMatch),
  );
  const busy = Boolean(court.activeMatchId && !liveMatch && !friendlyLiveMatch);
  const isTied = Boolean(liveMatch && scores && scores.a === scores.b && scores.a > 0);
  const selectedMatch = startableMatches.find((m) => m.id === pickMatchId) ?? null;
  const selectedNeedsRematch = selectedMatch?.status === "completed";
  const [localFriendlyA, setLocalFriendlyA] = useState(friendlyLiveMatch?.scoreA ?? 0);
  const [localFriendlyB, setLocalFriendlyB] = useState(friendlyLiveMatch?.scoreB ?? 0);
  const friendlyScoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalFriendlyA(friendlyLiveMatch?.scoreA ?? 0);
    setLocalFriendlyB(friendlyLiveMatch?.scoreB ?? 0);
  }, [friendlyLiveMatch?.id, friendlyLiveMatch?.scoreA, friendlyLiveMatch?.scoreB]);

  useEffect(
    () => () => {
      if (friendlyScoreSyncRef.current) clearTimeout(friendlyScoreSyncRef.current);
    },
    [],
  );

  const pushFriendlyScore = useCallback(
    (nextA: number, nextB: number) => {
      setLocalFriendlyA(nextA);
      setLocalFriendlyB(nextB);
      if (friendlyScoreSyncRef.current) clearTimeout(friendlyScoreSyncRef.current);
      friendlyScoreSyncRef.current = setTimeout(() => {
        onFriendlyScoreChange({ scoreA: nextA, scoreB: nextB, action: "set" });
      }, 120);
    },
    [onFriendlyScoreChange],
  );

  const friendlyTimerRemaining =
    friendlyLiveMatch?.timerEndsAt && scoringType === "timed"
      ? Math.max(
          0,
          Math.floor((new Date(friendlyLiveMatch.timerEndsAt).getTime() - Date.now()) / 1000),
        )
      : null;

  const courtLock = useMemo(
    () => buildBracketCourtLockState(activeMatches, teams, court.id, reclubActiveMatches),
    [activeMatches, court.id, teams, reclubActiveMatches],
  );

  return (
    <article
      className={cn(
        "flex h-full min-h-[17rem] min-w-0 flex-col rounded-2xl border bg-cp-card p-3 sm:min-h-[18rem] sm:p-4",
        liveMatch
          ? "border-cp-primary/40 ring-1 ring-cp-primary/20"
          : friendlyLiveMatch
            ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
            : "border-cp-border",
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
                liveMatch
                  ? "bg-red-500/15 text-red-400"
                  : friendlyLiveMatch
                    ? "bg-emerald-500/15 text-emerald-400"
                    : busy
                      ? cpStatusAmberClass
                      : "bg-cp-elevated text-cp-muted",
              )}
            >
              {liveMatch ? "Live" : friendlyLiveMatch ? "Friendly" : busy ? "Busy" : "Idle"}
            </span>
          </>
        )}
      </div>

      {liveMatch && scores ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide sm:gap-2 sm:text-xs">
            <span className="rounded-full border border-cp-border bg-cp-elevated/50 px-2 py-0.5 text-cp-muted">
              R{liveMatch.roundNumber} · M{liveMatch.matchNumber}
            </span>
            <span className="rounded-full border border-cp-primary/30 bg-cp-primary/10 px-2 py-0.5 text-cp-primary">
              {pointsPerMatch} pts
            </span>
            <span className={cn("rounded-full px-2 py-0.5", cpBadgeDangerClass)}>
              Live
            </span>
            <span className="rounded-full border border-cp-border bg-cp-elevated/50 px-2 py-0.5 tabular-nums text-cp-muted">
              {formatDuration(elapsed)}
            </span>
          </div>

          <LiveScoreboard
            variant="compact"
            teamAName={liveMatch.teamAName ?? "Team A"}
            teamBName={liveMatch.teamBName ?? "Team B"}
            teamAPlayers={liveMatch.teamAPlayers}
            teamBPlayers={liveMatch.teamBPlayers}
            scoreA={scores.a}
            scoreB={scores.b}
            onScoreAChange={(n, options) => {
              const prev = scores.a;
              const meta =
                n === prev + 1
                  ? { action: "increment" as const, side: "a" as const, ...options }
                  : n === prev - 1
                    ? { action: "decrement" as const, side: "a" as const }
                    : { action: "set" as const, side: "a" as const, ...options };
              onPersistScore(n, scores.b, meta);
            }}
            onScoreBChange={(n, options) => {
              const prev = scores.b;
              const meta =
                n === prev + 1
                  ? { action: "increment" as const, side: "b" as const, ...options }
                  : n === prev - 1
                    ? { action: "decrement" as const, side: "b" as const }
                    : { action: "set" as const, side: "b" as const, ...options };
              onPersistScore(scores.a, n, meta);
            }}
            disabled={!canScore || scoreSyncing || finalizePending}
            maxScore={pointsPerMatch}
            status={scoreSyncing ? "syncing" : "idle"}
          />

          {canScore ? (
            isTied ? (
              <div className="mt-auto space-y-2">
                <p className={cn("px-3 py-2", cpAlertWarningCompactSurfaceClass)}>
                  Scores are tied — replay this match before finalizing.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full", cpAlertWarningOutlineButtonClass)}
                  disabled={replayingTie}
                  onClick={onReplayTie}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {replayingTie ? "Resetting…" : "Replay match"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className={cn(
                  "mt-auto w-full",
                  isOfficial
                    ? "bg-cp-primary hover:bg-cp-primary-light"
                    : "bg-emerald-600 hover:bg-emerald-500",
                )}
                disabled={finalizePending}
                onClick={onFinalize}
              >
                <Trophy className="mr-2 h-4 w-4" />
                {finalizePending ? "Finalizing…" : "Finalize match"}
              </Button>
            )
          ) : null}
        </div>
      ) : friendlyLiveMatch ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide sm:gap-2 sm:text-xs">
            <span className={cn("rounded-full px-2 py-0.5", cpBadgeSuccessClass)}>
              Friendly game
            </span>
            <span className="rounded-full border border-cp-border bg-cp-elevated/50 px-2 py-0.5 tabular-nums text-cp-muted">
              {formatDuration(friendlyElapsed)}
            </span>
          </div>
          {friendlyTimerRemaining != null ? (
            <div className="h-1 overflow-hidden rounded-full bg-cp-elevated">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((roundDuration * 60 - friendlyTimerRemaining) / (roundDuration * 60)) * 100)}%`,
                }}
              />
            </div>
          ) : null}
          <LiveScoreboard
            variant="compact"
            teamAName={friendlyLiveMatch.teamAName ?? "Team A"}
            teamBName={friendlyLiveMatch.teamBName ?? "Team B"}
            teamAPlayers={friendlyLiveMatch.teamAPlayers}
            teamBPlayers={friendlyLiveMatch.teamBPlayers}
            scoreA={localFriendlyA}
            scoreB={localFriendlyB}
            maxScore={pointsPerMatch}
            disabled={!canScore || friendlyScoreSyncing || friendlyCompletePending}
            onScoreAChange={(v) => pushFriendlyScore(v, localFriendlyB)}
            onScoreBChange={(v) => pushFriendlyScore(localFriendlyA, v)}
            status={friendlyScoreSyncing ? "syncing" : "idle"}
          />
          {canScore ? (
            <Button
              type="button"
              variant="secondary"
              className={cn("mt-auto w-full", cpEmeraldGhostButtonClass)}
              disabled={friendlyCompletePending}
              onClick={() => onFriendlyComplete(friendlyElapsed)}
            >
              <Trophy className="mr-2 h-4 w-4" />
              {friendlyCompletePending ? "Finalizing…" : "Finalize friendly"}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-cp-muted">Bracket match</Label>
            <Select
              value={pickMatchId || "__none__"}
              onValueChange={(v) => onPickMatch(v === "__none__" ? "" : v)}
              disabled={!canScore || startableMatches.length === 0}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full min-w-0")}>
                <SelectValue
                  placeholder={
                    startableMatches.length ? "Select match…" : "No matches available"
                  }
                />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="__none__" className={cpSelectItemClass}>
                  Select match…
                </SelectItem>
                {startableMatches.map((m) => {
                  const locked = isBracketMatchLockedForCourt(m, courtLock, teams);
                  const reason = bracketMatchLockReason(m, courtLock, teams);
                  return (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      disabled={locked}
                      className={cpSelectItemClass}
                      title={reason ?? undefined}
                    >
                      <span className="line-clamp-2 text-left">
                        {formatStartableMatch(m)}
                        {locked ? " (on court)" : ""}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!canScore || !pickMatchId || starting || busy}
            onClick={onStart}
          >
            {starting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {selectedNeedsRematch ? "Play again on court" : "Start on court"}
          </Button>

          {showFriendly ? (
            <div className="mt-1 space-y-2 border-t border-cp-border pt-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                <Users className="h-3 w-3" />
                Friendly game
              </p>
              <div className="grid gap-2">
                <Select
                  value={friendlyTeamAId || "__none__"}
                  onValueChange={(v) => onFriendlyTeamAChange(v === "__none__" ? "" : v)}
                  disabled={!canScore || busy}
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-9 w-full")}>
                    <SelectValue placeholder="Squad A" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value="__none__" className={cpSelectItemClass}>
                      Squad A
                    </SelectItem>
                    {teams
                      .filter((t) => t.memberCount > 0)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select
                  value={friendlyTeamBId || "__none__"}
                  onValueChange={(v) => onFriendlyTeamBChange(v === "__none__" ? "" : v)}
                  disabled={!canScore || busy}
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-9 w-full")}>
                    <SelectValue placeholder="Squad B" />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value="__none__" className={cpSelectItemClass}>
                      Squad B
                    </SelectItem>
                    {teams
                      .filter((t) => t.memberCount > 0)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id} className={cpSelectItemClass}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-emerald-500/40 text-emerald-300"
                disabled={
                  !canScore ||
                  busy ||
                  !friendlyTeamAId ||
                  !friendlyTeamBId ||
                  friendlyTeamAId === friendlyTeamBId ||
                  startingFriendly
                }
                onClick={onStartFriendly}
              >
                {startingFriendly ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start friendly
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

export function BracketCourtScoringGrid({
  sportSlug,
  slug,
  courts,
  matches,
  teams,
  participant,
  pointsPerMatch,
  canScore,
  tournamentType,
  reclubActiveMatches = [],
  friendlyAByCourt: controlledFriendlyA,
  friendlyBByCourt: controlledFriendlyB,
  onFriendlyPickAChange,
  onFriendlyPickBChange,
  onFriendlyScoreChange,
  onFriendlyComplete,
  friendlyScoreSyncing = false,
  friendlyCompletePending = false,
  scoringType = "points",
  roundDuration = 20,
}: BracketCourtScoringGridProps) {
  const { confirm } = useConfirmDialog();
  const startMatch = useStartBracketMatchOnCourt(sportSlug, slug);
  const rematchMatch = useRematchBracketMatch(sportSlug, slug);
  const startFriendly = useStartReclubRound(sportSlug, slug);
  const liveScore = useUpdateBracketLiveScore(sportSlug, slug);
  const finalizeScore = useSubmitBracketScore(sportSlug, slug);
  const renameCourt = useRenameTournamentCourt(sportSlug, slug);
  const isOfficial = isOfficialType(tournamentType);
  const isFunMatch = isFunMatchType(tournamentType);

  const [pickByCourt, setPickByCourt] = useState<Record<string, string>>({});
  const [friendlyAByCourt, setFriendlyAByCourt] = useState<Record<string, string>>({});
  const [friendlyBByCourt, setFriendlyBByCourt] = useState<Record<string, string>>({});
  const [localScores, setLocalScores] = useState<Record<string, { a: number; b: number }>>({});
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [courtNameDraft, setCourtNameDraft] = useState("");
  const scoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeMatches = useMemo(
    () => matches.filter((m) => m.status === "in_progress"),
    [matches],
  );

  const matchByCourt = useMemo(() => {
    const map = new Map<string, BracketMatchView>();
    for (const m of activeMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
    return map;
  }, [activeMatches]);

  const friendlyMatchByCourt = useMemo(() => {
    const map = new Map<string, ReclubMatchView>();
    for (const m of reclubActiveMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
    return map;
  }, [reclubActiveMatches]);

  const getFriendlyA = useCallback(
    (courtId: string) => controlledFriendlyA?.[courtId] ?? friendlyAByCourt[courtId] ?? "",
    [controlledFriendlyA, friendlyAByCourt],
  );

  const getFriendlyB = useCallback(
    (courtId: string) => controlledFriendlyB?.[courtId] ?? friendlyBByCourt[courtId] ?? "",
    [controlledFriendlyB, friendlyBByCourt],
  );

  const setFriendlyA = useCallback(
    (courtId: string, value: string) => {
      if (onFriendlyPickAChange) onFriendlyPickAChange(courtId, value);
      else setFriendlyAByCourt((prev) => ({ ...prev, [courtId]: value }));
    },
    [onFriendlyPickAChange],
  );

  const setFriendlyB = useCallback(
    (courtId: string, value: string) => {
      if (onFriendlyPickBChange) onFriendlyPickBChange(courtId, value);
      else setFriendlyBByCourt((prev) => ({ ...prev, [courtId]: value }));
    },
    [onFriendlyPickBChange],
  );

  const startableMatches = useMemo(() => {
    const playable = matches.filter(
      (m) =>
        (m.status === "pending" || m.status === "completed") && m.teamAId && m.teamBId,
    );
    return playable.sort((a, b) => {
      if (a.status === "pending" && b.status === "completed") return -1;
      if (a.status === "completed" && b.status === "pending") return 1;
      if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
      return a.matchNumber - b.matchNumber;
    });
  }, [matches]);

  const getScores = useCallback(
    (match: BracketMatchView) =>
      localScores[match.id] ?? { a: match.scoreA ?? 0, b: match.scoreB ?? 0 },
    [localScores],
  );

  useEffect(
    () => () => {
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
    },
    [],
  );

  const persistScore = useCallback(
    (
      match: BracketMatchView,
      a: number,
      b: number,
      meta?: {
        action?: "increment" | "decrement" | "set";
        side?: "a" | "b";
        scorerName?: string;
        scorerUserId?: string;
      },
    ) => {
      setLocalScores((prev) => ({ ...prev, [match.id]: { a, b } }));
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
      scoreSyncRef.current = setTimeout(() => {
        liveScore.mutate({
          matchId: match.id,
          scoreA: a,
          scoreB: b,
          action: meta?.action,
          side: meta?.side,
          scorerName: meta?.scorerName,
          scorerUserId: meta?.scorerUserId,
        });
      }, 120);
    },
    [liveScore],
  );

  const handleFinalize = useCallback(
    async (match: BracketMatchView) => {
      const { a, b } = getScores(match);
      if (a === b) {
        toast.error("Scores are tied — use Replay match to play again");
        return;
      }
      const ok = await confirm({
        title: "Finalize match result?",
        description: `${match.teamAName} ${a}–${b} ${match.teamBName}. Winner advances in the bracket.`,
        confirmLabel: "Finalize",
      });
      if (!ok) return;
      if (scoreSyncRef.current) {
        clearTimeout(scoreSyncRef.current);
        scoreSyncRef.current = null;
      }
      finalizeScore.mutate(
        { matchId: match.id, scoreA: a, scoreB: b },
        {
          onSuccess: () => {
            setLocalScores((prev) => {
              const next = { ...prev };
              delete next[match.id];
              return next;
            });
          },
        },
      );
    },
    [confirm, finalizeScore, getScores],
  );

  const handleStart = async (courtId: string) => {
    const matchId = pickByCourt[courtId];
    if (!matchId) {
      toast.error("Select a match to start on this court");
      return;
    }
    const match = matches.find((m) => m.id === matchId);
    const needsRematch = match?.status === "completed";
    const court = courts.find((c) => c.id === courtId);
    if (match) {
      const lock = buildBracketCourtLockState(activeMatches, teams, courtId, reclubActiveMatches);
      if (isBracketMatchLockedForCourt(match, lock, teams)) {
        toast.error(
          bracketMatchLockReason(match, lock, teams) ??
            "One of these squads is already playing on another court",
        );
        return;
      }
    }
    const ok = await confirm({
      title: needsRematch ? "Play again on court?" : "Start match on court?",
      description: `${match ? formatStartableMatch(match) : "Match"} on ${court?.name ?? "court"}${
        needsRematch
          ? ". Previous result is saved to history; bracket advancement rolls back for this slot."
          : ""
      }`,
      confirmLabel: needsRematch ? "Play again" : "Start match",
    });
    if (!ok) return;
    if (needsRematch) {
      await rematchMatch.mutateAsync({ matchId });
    }
    await startMatch.mutateAsync({ matchId, courtId });
    setPickByCourt((prev) => ({ ...prev, [courtId]: "" }));
  };

  const handleReplayTie = async (match: BracketMatchView) => {
    const ok = await confirm({
      title: "Replay tied match?",
      description: "Scores will reset and the same bracket slot returns to pending.",
      confirmLabel: "Replay",
    });
    if (!ok) return;
    await rematchMatch.mutateAsync({ matchId: match.id });
    setLocalScores((prev) => {
      const next = { ...prev };
      delete next[match.id];
      return next;
    });
  };

  const handleStartFriendly = async (courtId: string) => {
    const teamAId = getFriendlyA(courtId);
    const teamBId = getFriendlyB(courtId);
    if (!teamAId || !teamBId || teamAId === teamBId) {
      toast.error("Select two different squads");
      return;
    }
    const ok = await confirm({
      title: "Start friendly game?",
      description: "Bracket tree stays unchanged — result goes to session history.",
      confirmLabel: "Start friendly",
    });
    if (!ok) return;
    await startFriendly.mutateAsync({ teamAId, teamBId, courtId, playType: "friendly" });
    setFriendlyA(courtId, "");
    setFriendlyB(courtId, "");
  };

  if (!courts.length) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border px-4 py-8 text-center text-sm text-cp-muted">
        No courts configured for this tournament.
      </div>
    );
  }

  return (
    <div className={manageCourtGridClassName}>
      {courts.map((court) => {
        const liveMatch = matchByCourt.get(court.id) ?? null;
        const friendlyLiveMatch = friendlyMatchByCourt.get(court.id) ?? null;
        const scores = liveMatch ? getScores(liveMatch) : null;

        return (
          <BracketCourtCard
            key={court.id}
            court={court}
            liveMatch={liveMatch}
            friendlyLiveMatch={friendlyLiveMatch}
            startableMatches={startableMatches}
            pickMatchId={pickByCourt[court.id] ?? ""}
            onPickMatch={(v) => setPickByCourt((prev) => ({ ...prev, [court.id]: v }))}
            friendlyTeamAId={getFriendlyA(court.id)}
            friendlyTeamBId={getFriendlyB(court.id)}
            onFriendlyTeamAChange={(v) => setFriendlyA(court.id, v)}
            onFriendlyTeamBChange={(v) => setFriendlyB(court.id, v)}
            onStartFriendly={() => void handleStartFriendly(court.id)}
            startingFriendly={startFriendly.isPending}
            showFriendly={isFunMatch && !liveMatch && !friendlyLiveMatch}
            onFriendlyScoreChange={(input) =>
              friendlyLiveMatch && onFriendlyScoreChange?.(friendlyLiveMatch.id, input)
            }
            onFriendlyComplete={(elapsed) =>
              friendlyLiveMatch && onFriendlyComplete?.(friendlyLiveMatch, elapsed)
            }
            friendlyScoreSyncing={friendlyScoreSyncing}
            friendlyCompletePending={friendlyCompletePending}
            scoringType={scoringType}
            roundDuration={roundDuration}
            onReplayTie={() => liveMatch && void handleReplayTie(liveMatch)}
            replayingTie={rematchMatch.isPending}
            activeMatches={activeMatches}
            teams={teams}
            onStart={() => void handleStart(court.id)}
            starting={startMatch.isPending || rematchMatch.isPending}
            canScore={canScore && participant.canUseCourtsideScoring}
            isOfficial={isOfficial}
            pointsPerMatch={pointsPerMatch}
            scores={scores}
            onPersistScore={(a, b, meta) => liveMatch && persistScore(liveMatch, a, b, meta)}
            onFinalize={() => liveMatch && void handleFinalize(liveMatch)}
            scoreSyncing={liveScore.isPending}
            finalizePending={finalizeScore.isPending}
            editingName={editingCourtId === court.id}
            nameDraft={courtNameDraft}
            onEditName={() => {
              setEditingCourtId(court.id);
              setCourtNameDraft(court.name);
            }}
            onNameDraftChange={setCourtNameDraft}
            onSaveName={async () => {
              const ok = await confirm({
                title: "Rename court?",
                description: `Save court name as "${courtNameDraft.trim()}"?`,
                confirmLabel: "Save",
              });
              if (!ok) return;
              await renameCourt.mutateAsync({ courtId: court.id, name: courtNameDraft });
              setEditingCourtId(null);
            }}
            onCancelEdit={() => setEditingCourtId(null)}
            reclubActiveMatches={reclubActiveMatches}
          />
        );
      })}
    </div>
  );
}
