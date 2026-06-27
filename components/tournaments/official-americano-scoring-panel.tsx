"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Radio } from "lucide-react";
import { toast } from "sonner";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useCompleteReclubRound,
  useStartReclubRound,
  useTournamentLobby,
  useUpdateReclubLiveScore,
} from "@/hooks/use-tournament-lobby";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { getMaxRounds, getTournamentPointsPerMatch } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type OfficialAmericanoScoringPanelProps = {
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  livePhase: "not_started" | "live" | "completed" | "cancelled";
  variant?: "manage" | "live";
};

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

function TeamSelect({
  label,
  value,
  onChange,
  teams,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  teams: { id: string; name: string; memberCount: number }[];
  exclude: string;
}) {
  return (
    <div className="min-w-[140px] flex-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 py-2 text-sm"
      >
        <option value="">Select…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} disabled={t.id === exclude}>
            {t.name} ({t.memberCount})
          </option>
        ))}
      </select>
    </div>
  );
}

export function OfficialAmericanoScoringPanel({
  tournament,
  participant,
  livePhase,
  variant = "manage",
}: OfficialAmericanoScoringPanelProps) {
  const { confirm } = useConfirmDialog();
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const maxRounds = getMaxRounds(tournament);
  const canPlay = livePhase === "live";
  const canUseHostControls = participant.canUseHostControls;

  const { data, isLoading } = useTournamentLobby(tournament.sportSlug, tournament.slug);
  const startRound = useStartReclubRound(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);
  const updateLiveScore = useUpdateReclubLiveScore(tournament.sportSlug, tournament.slug);

  const teams = data?.teams ?? [];
  const matches = data?.matches ?? [];
  const activeMatch = data?.activeMatch ?? null;

  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [scoreStatus, setScoreStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const scoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveElapsed = useLiveTimer(activeMatch?.startedAt ?? null, Boolean(activeMatch));

  const teamOptions = useMemo(
    () => teams.filter((t) => t.memberCount > 0).map((t) => ({ id: t.id, name: t.name, memberCount: t.memberCount })),
    [teams],
  );

  const completedRounds = matches.filter((m) => m.status === "completed").length;
  const roundsRemaining =
    maxRounds != null ? Math.max(0, maxRounds - completedRounds - (activeMatch ? 1 : 0)) : null;

  useEffect(() => {
    if (activeMatch) {
      setScoreA(String(activeMatch.scoreA ?? 0));
      setScoreB(String(activeMatch.scoreB ?? 0));
      setScoreStatus("idle");
    }
  }, [activeMatch?.id, activeMatch?.scoreA, activeMatch?.scoreB]);

  useEffect(
    () => () => {
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
    },
    [],
  );

  const persistLiveScore = useCallback(
    (a: number, b: number, side?: "a" | "b", action?: "increment" | "decrement" | "set") => {
      if (!activeMatch || !canUseHostControls) return;
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
      setScoreStatus("syncing");
      scoreSyncRef.current = setTimeout(() => {
        updateLiveScore.mutate(
          {
            matchId: activeMatch.id,
            scoreA: a,
            scoreB: b,
            side,
            action: action ?? "set",
          },
          {
            onSuccess: () => setScoreStatus("saved"),
            onError: () => setScoreStatus("error"),
          },
        );
      }, 400);
    },
    [activeMatch, canUseHostControls, updateLiveScore],
  );

  const handleStartRound = async () => {
    if (!canPlay) {
      toast.error(
        livePhase === "completed"
          ? "This tournament has ended."
          : "Round scoring unlocks when the tournament is live.",
      );
      return;
    }
    if (!teamAId || !teamBId) {
      toast.error("Select two teams");
      return;
    }
    const ok = await confirm({
      title: "Start this round?",
      description: "Teams lock until the round is completed.",
      confirmLabel: "Start round",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    startRound.mutate({ teamAId, teamBId });
  };

  const handleCompleteRound = async () => {
    if (!activeMatch) return;
    const ok = await confirm({
      title: "End round & save scores?",
      description: "Results are saved to player stats for this official Americano event.",
      confirmLabel: "Complete round",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    if (scoreSyncRef.current) {
      clearTimeout(scoreSyncRef.current);
      scoreSyncRef.current = null;
    }
    completeRound.mutate({
      matchId: activeMatch.id,
      scoreA: Number(scoreA) || 0,
      scoreB: Number(scoreB) || 0,
      durationSeconds: liveElapsed,
    });
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading rounds…" />;
  }

  if (teamOptions.length < 2 && variant === "manage" && canUseHostControls) {
    return (
      <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 p-6 text-center">
        <p className="text-sm text-cp-muted">
          At least two confirmed teams are required before you can start Americano rounds.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {variant === "manage" && canUseHostControls ? (
        <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
          <h3 className="font-semibold text-foreground">Americano round scoring</h3>
          <p className="mt-1 text-sm text-cp-muted">
            Official Americano uses rotating rounds — not a knockout bracket. Pick two teams and
            record each round here.
            {maxRounds != null ? (
              <span className="mt-1 block">
                {roundsRemaining === 0
                  ? "All rounds for this event have been played."
                  : `${roundsRemaining} round${roundsRemaining === 1 ? "" : "s"} remaining of ${maxRounds}.`}
              </span>
            ) : null}
          </p>
          {!canPlay ? (
            <p className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm text-sky-200/90">
              Round scoring unlocks when the tournament status is Live.
            </p>
          ) : !activeMatch && teamOptions.length >= 2 ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <TeamSelect
                label="Team A"
                value={teamAId}
                onChange={setTeamAId}
                teams={teamOptions}
                exclude={teamBId}
              />
              <TeamSelect
                label="Team B"
                value={teamBId}
                onChange={setTeamBId}
                teams={teamOptions}
                exclude={teamAId}
              />
              <Button
                className="bg-cp-primary hover:bg-cp-primary-light"
                disabled={startRound.isPending || roundsRemaining === 0}
                onClick={() => void handleStartRound()}
              >
                {startRound.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start round
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeMatch ? (
        <section className="rounded-2xl border border-cp-primary/25 bg-cp-card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-primary">
                <Radio className="h-4 w-4 animate-pulse" />
                Round {activeMatch.roundNumber} · Live
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                {activeMatch.teamAName} vs {activeMatch.teamBName}
              </h2>
              <p className="mt-1 text-sm text-cp-muted">{formatDuration(liveElapsed)} elapsed</p>
            </div>
          </div>

          {canUseHostControls ? (
            <div className="mt-6">
              <LiveScoreboard
                teamAName={activeMatch.teamAName ?? "Team A"}
                teamBName={activeMatch.teamBName ?? "Team B"}
                scoreA={Number(scoreA) || 0}
                scoreB={Number(scoreB) || 0}
                onScoreAChange={(n) => {
                  setScoreA(String(n));
                  persistLiveScore(n, Number(scoreB) || 0, "a", "set");
                }}
                onScoreBChange={(n) => {
                  setScoreB(String(n));
                  persistLiveScore(Number(scoreA) || 0, n, "b", "set");
                }}
                maxScore={pointsPerMatch}
                disabled={completeRound.isPending}
                status={scoreStatus}
              />
              <Button
                className="mt-4 w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
                disabled={completeRound.isPending}
                onClick={() => void handleCompleteRound()}
              >
                {completeRound.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Complete round
              </Button>
            </div>
          ) : (
            <p className="mt-6 text-center text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
              {activeMatch.scoreA ?? 0} : {activeMatch.scoreB ?? 0}
            </p>
          )}
        </section>
      ) : variant === "live" ? (
        <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 p-6 text-center sm:p-10">
          <Radio className="mx-auto h-8 w-8 text-cp-primary/80" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">No live round right now</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-cp-muted">
            {livePhase === "not_started"
              ? "Americano rounds appear here once the host starts play."
              : "Round results will show here when a match is in progress or completed."}
          </p>
        </section>
      ) : null}

      {matches.length > 0 ? (
        <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
          <h3 className="font-semibold text-foreground">Round history</h3>
          <ul className="mt-3 divide-y divide-cp-border/60">
            {matches.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="min-w-0 font-medium text-foreground">
                  R{m.roundNumber}: {m.teamAName ?? "TBD"} vs {m.teamBName ?? "TBD"}
                </span>
                <span className="shrink-0 tabular-nums text-cp-muted">
                  {m.status === "in_progress"
                    ? `${m.scoreA ?? 0} : ${m.scoreB ?? 0} · Live`
                    : m.status === "completed"
                      ? `${m.scoreA ?? 0} : ${m.scoreB ?? 0} · Final`
                      : "Scheduled"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
