"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Play, Trophy } from "lucide-react";
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
  useStartBracketMatchOnCourt,
  useSubmitBracketScore,
  useUpdateBracketLiveScore,
} from "@/hooks/use-tournament-bracket";
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
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { isOfficialType } from "@/lib/tournaments/core/types";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
  manageCourtGridClassName,
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
  /** Fun-match hybrid: lock squads active in reclub rounds on other courts. */
  reclubActiveMatches?: Pick<
    import("@/lib/tournaments/reclub/types").ReclubMatchView,
    "teamAId" | "teamBId" | "courtId"
  >[];
};

function formatReadyMatch(m: BracketMatchView): string {
  return `R${m.roundNumber} M${m.matchNumber}: ${m.teamAName} vs ${m.teamBName}`;
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
  readyMatches,
  activeMatches,
  teams,
  pickMatchId,
  onPickMatch,
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
}: {
  court: TournamentCourtView;
  liveMatch: BracketMatchView | null;
  readyMatches: BracketMatchView[];
  activeMatches: BracketMatchView[];
  teams: LobbyTeamView[];
  reclubActiveMatches: Pick<
    import("@/lib/tournaments/reclub/types").ReclubMatchView,
    "teamAId" | "teamBId" | "courtId"
  >[];
  pickMatchId: string;
  onPickMatch: (matchId: string) => void;
  onStart: () => void;
  starting: boolean;
  canScore: boolean;
  isOfficial: boolean;
  pointsPerMatch: number;
  scores: { a: number; b: number } | null;
  onPersistScore: (a: number, b: number) => void;
  onFinalize: () => void;
  scoreSyncing: boolean;
  finalizePending: boolean;
  editingName: boolean;
  nameDraft: string;
  onEditName: () => void;
  onNameDraftChange: (v: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
}) {
  const elapsed = useLiveTimer(liveMatch?.startedAt ?? null, Boolean(liveMatch));
  const busy = Boolean(court.activeMatchId && !liveMatch);

  const courtLock = useMemo(
    () => buildBracketCourtLockState(activeMatches, teams, court.id, reclubActiveMatches),
    [activeMatches, court.id, teams, reclubActiveMatches],
  );

  return (
    <article
      className={cn(
        "flex h-full min-h-[17rem] min-w-0 flex-col rounded-2xl border bg-cp-card p-3 sm:min-h-[18rem] sm:p-4",
        liveMatch ? "border-cp-primary/40 ring-1 ring-cp-primary/20" : "border-cp-border",
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
                  : busy
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-cp-elevated text-cp-muted",
              )}
            >
              {liveMatch ? "Live" : busy ? "Busy" : "Idle"}
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
            <span className="rounded-full border border-red-500/30 bg-red-950/30 px-2 py-0.5 text-red-300">
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
            scoreA={scores.a}
            scoreB={scores.b}
            onScoreAChange={(n) => onPersistScore(n, scores.b)}
            onScoreBChange={(n) => onPersistScore(scores.a, n)}
            disabled={!canScore || scoreSyncing || finalizePending}
            maxScore={pointsPerMatch}
            status={scoreSyncing ? "syncing" : "idle"}
          />

          {canScore ? (
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
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-cp-muted">Ready match</Label>
            <Select
              value={pickMatchId || "__none__"}
              onValueChange={(v) => onPickMatch(v === "__none__" ? "" : v)}
              disabled={!canScore || readyMatches.length === 0}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full min-w-0")}>
                <SelectValue
                  placeholder={readyMatches.length ? "Select match…" : "No matches ready"}
                />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="__none__" className={cpSelectItemClass}>
                  Select match…
                </SelectItem>
                {readyMatches.map((m) => {
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
                        {formatReadyMatch(m)}
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
            className="mt-auto w-full"
            disabled={!canScore || !pickMatchId || starting || busy}
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
}: BracketCourtScoringGridProps) {
  const { confirm } = useConfirmDialog();
  const startMatch = useStartBracketMatchOnCourt(sportSlug, slug);
  const liveScore = useUpdateBracketLiveScore(sportSlug, slug);
  const finalizeScore = useSubmitBracketScore(sportSlug, slug);
  const renameCourt = useRenameTournamentCourt(sportSlug, slug);
  const isOfficial = isOfficialType(tournamentType);

  const [pickByCourt, setPickByCourt] = useState<Record<string, string>>({});
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

  const readyMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.status === "pending" &&
          m.teamAId &&
          m.teamBId,
      ),
    [matches],
  );

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
    (match: BracketMatchView, a: number, b: number) => {
      setLocalScores((prev) => ({ ...prev, [match.id]: { a, b } }));
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
      scoreSyncRef.current = setTimeout(() => {
        liveScore.mutate({ matchId: match.id, scoreA: a, scoreB: b });
      }, 120);
    },
    [liveScore],
  );

  const handleFinalize = useCallback(
    async (match: BracketMatchView) => {
      const { a, b } = getScores(match);
      if (a === b) {
        toast.error("Set a winner — scores cannot be tied in elimination");
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
    const match = readyMatches.find((m) => m.id === matchId);
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
      title: "Start match on court?",
      description: `${match ? formatReadyMatch(match) : "Match"} on ${court?.name ?? "court"}`,
      confirmLabel: "Start match",
    });
    if (!ok) return;
    await startMatch.mutateAsync({ matchId, courtId });
    setPickByCourt((prev) => ({ ...prev, [courtId]: "" }));
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
        const scores = liveMatch ? getScores(liveMatch) : null;

        return (
          <BracketCourtCard
            key={court.id}
            court={court}
            liveMatch={liveMatch}
            readyMatches={readyMatches}
            activeMatches={activeMatches}
            teams={teams}
            pickMatchId={pickByCourt[court.id] ?? ""}
            onPickMatch={(v) => setPickByCourt((prev) => ({ ...prev, [court.id]: v }))}
            onStart={() => void handleStart(court.id)}
            starting={startMatch.isPending}
            canScore={canScore && participant.canUseCourtsideScoring}
            isOfficial={isOfficial}
            pointsPerMatch={pointsPerMatch}
            scores={scores}
            onPersistScore={(a, b) => liveMatch && persistScore(liveMatch, a, b)}
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
