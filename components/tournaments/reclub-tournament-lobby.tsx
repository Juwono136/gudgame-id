"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Gamepad2,
  Loader2,
  MapPin,
  Play,
  Swords,
  Timer,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { FadeInView } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ReclubLobbyDnd } from "@/components/tournaments/reclub-lobby-dnd";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import {
  useCompleteReclubRound,
  useCreateReclubTeam,
  useStartReclubRound,
  useSwitchTeam,
  useTournamentLobby,
} from "@/hooks/use-tournament-lobby";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";

type ReclubTournamentLobbyProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  isAuthenticated: boolean;
  initialUserTeamId?: string | null;
};

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
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  return elapsed;
}

export function ReclubTournamentLobby({
  tournament,
  summary: initialSummary,
  isAuthenticated,
  initialUserTeamId = null,
}: ReclubTournamentLobbyProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { data, isLoading, isFetching, refetch } = useTournamentLobby(
    tournament.sportSlug,
    tournament.slug,
  );

  const switchTeam = useSwitchTeam(tournament.sportSlug, tournament.slug);
  const createTeam = useCreateReclubTeam(tournament.sportSlug, tournament.slug);
  const startRound = useStartReclubRound(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);

  const [joining, setJoining] = useState(false);
  const [teamAId, setTeamAId] = useState<string | "">("");
  const [teamBId, setTeamBId] = useState<string | "">("");
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");

  const summary = data?.summary ?? initialSummary;
  const teams = data?.teams ?? [];
  const matches = data?.matches ?? [];
  const activeMatch = data?.activeMatch ?? null;
  const userTeamId = data?.userTeamId ?? initialUserTeamId;
  const canManage = data?.canManage ?? false;
  const currentUserId = data?.userId ?? null;

  const liveElapsed = useLiveTimer(activeMatch?.startedAt ?? null, Boolean(activeMatch));

  const busy =
    joining ||
    switchTeam.isPending ||
    startRound.isPending ||
    completeRound.isPending;

  const handleJoin = async () => {
    if (!isAuthenticated) {
      const callback = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
      router.push(`${authRoutes.register}?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    const ok = await confirm({
      title: "Join this reclub session?",
      description:
        "You'll be placed on a team before play starts. You can switch teams freely until the host begins a round.",
      confirmLabel: "Join lobby",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setJoining(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/join`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not join");
      toast.success("You're in the lobby!");
      void refetch();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Join failed");
    } finally {
      setJoining(false);
    }
  };

  const handleSwitch = async (teamId: string) => {
    if (activeMatch) {
      toast.error("Cannot switch teams during an active round");
      return;
    }
    const ok = await confirm({
      title: "Switch to this team?",
      description: "Your slot will move to the selected squad.",
      confirmLabel: "Switch",
      cancelLabel: "Stay",
    });
    if (!ok) return;
    switchTeam.mutate(teamId);
  };

  const handleStartRound = async () => {
    if (teamAId === "" || teamBId === "") {
      toast.error("Select two teams");
      return;
    }
    const ok = await confirm({
      title: "Start this round?",
      description: "Players will be locked to their teams until the round ends.",
      confirmLabel: "Start round",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    startRound.mutate({ teamAId: Number(teamAId), teamBId: Number(teamBId) });
  };

  const handleCompleteRound = async () => {
    if (!activeMatch) return;
    const ok = await confirm({
      title: "End round & save scores?",
      description: "Results will be written to each player's brief match history.",
      confirmLabel: "Complete round",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    completeRound.mutate({
      matchId: activeMatch.id,
      scoreA: Number(scoreA) || 0,
      scoreB: Number(scoreB) || 0,
      durationSeconds: liveElapsed,
    });
  };

  const teamOptions = useMemo(
    () => teams.filter((t) => t.memberCount > 0),
    [teams],
  );

  return (
    <div className="min-h-screen bg-cp-bg">
      <LoadingOverlay show={busy} label="Updating lobby…" />

      <div className="border-b border-cp-border bg-linear-to-b from-emerald-950/30 via-cp-card/60 to-cp-bg">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href={publicSportRoutes.tournaments(tournament.sportSlug)}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {tournament.sportName} tournaments
          </Link>

          <FadeInView className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-0 bg-emerald-500/20 text-emerald-300">
                <Gamepad2 className="mr-1 h-3 w-3" />
                Reclub — free play
              </Badge>
              <Badge className="border-cp-border bg-cp-elevated uppercase">{tournament.status}</Badge>
              {isFetching && !isLoading ? (
                <Badge variant="muted">
                  Syncing…
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">{tournament.name}</h1>
            {tournament.summary ? (
              <div className="mt-2 max-w-2xl">
                <RichHtmlContent html={tournament.summary} variant="article" />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-cp-muted">
              {tournament.venue ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {tournament.venue}
                </span>
              ) : null}
              {tournament.startsAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(tournament.startsAt),
                  )}
                </span>
              ) : null}
            </div>
          </FadeInView>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {activeMatch ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 overflow-hidden rounded-2xl border border-amber-500/40 bg-linear-to-r from-amber-950/40 to-cp-card p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Live round {activeMatch.roundNumber}
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">
                  {activeMatch.teamAName} vs {activeMatch.teamBName}
                </h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-amber-200/80">
                  <Timer className="h-4 w-4 animate-pulse" />
                  {formatDuration(liveElapsed)}
                </p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="text-xs text-cp-muted">{activeMatch.teamAName}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scoreA}
                      onChange={(e) => setScoreA(e.target.value)}
                      className="mt-1 w-20 border-cp-border bg-cp-bg-input"
                    />
                  </div>
                  <span className="pb-2 text-cp-muted">–</span>
                  <div>
                    <Label className="text-xs text-cp-muted">{activeMatch.teamBName}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scoreB}
                      onChange={(e) => setScoreB(e.target.value)}
                      className="mt-1 w-20 border-cp-border bg-cp-bg-input"
                    />
                  </div>
                  <Button
                    className="bg-amber-600 hover:bg-amber-500"
                    onClick={() => void handleCompleteRound()}
                    disabled={completeRound.isPending}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    End round
                  </Button>
                </div>
              ) : (
                <Badge className="border-amber-500/50 bg-amber-500/10 text-amber-300">
                  Match in progress
                </Badge>
              )}
            </div>
          </motion.div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Team lobby</h2>
            <p className="text-sm text-cp-muted">
              {summary.registeredPlayers} players · {teams.length} squads · max{" "}
              {tournament.playersPerTeam} per team
            </p>
          </div>
          {!userTeamId && tournament.status !== "completed" ? (
            <Button
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={joining}
              onClick={() => void handleJoin()}
            >
              {joining ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Swords className="mr-2 h-4 w-4" />
              )}
              {isAuthenticated ? "Join lobby" : "Sign up to join"}
            </Button>
          ) : userTeamId ? (
            <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              You&apos;re on a team
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <LoadingSpinner label="Loading lobby…" />
          </div>
        ) : teams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-cp-border py-16 text-center text-sm text-cp-muted">
            No teams yet — be the first to join and start a squad.
          </div>
        ) : (
          <div className="mt-8">
            <ReclubLobbyDnd
              teams={teams}
              playersPerTeam={tournament.playersPerTeam}
              userTeamId={userTeamId}
              currentUserId={currentUserId}
              activeMatch={Boolean(activeMatch)}
              onSwitchTeam={(teamId) => void handleSwitch(teamId)}
              onCreateTeam={(name) => createTeam.mutate(name)}
              creating={createTeam.isPending}
            />
          </div>
        )}

        {canManage && !activeMatch && teamOptions.length >= 2 ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-2xl border border-cp-border bg-cp-card p-6"
          >
            <h3 className="font-semibold text-foreground">Host controls</h3>
            <p className="mt-1 text-sm text-cp-muted">Pick two teams and start the next round.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <Label>Team A</Label>
                <select
                  value={teamAId}
                  onChange={(e) =>
                    setTeamAId(e.target.value || "")
                  }
                  className="mt-1 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.id === teamBId}>
                      {t.name} ({t.memberCount})
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px] flex-1">
                <Label>Team B</Label>
                <select
                  value={teamBId}
                  onChange={(e) =>
                    setTeamBId(e.target.value || "")
                  }
                  className="mt-1 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.id === teamAId}>
                      {t.name} ({t.memberCount})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="bg-cp-primary hover:bg-cp-primary-light"
                disabled={startRound.isPending}
                onClick={() => void handleStartRound()}
              >
                <Play className="mr-2 h-4 w-4" />
                Start round
              </Button>
            </div>
          </motion.section>
        ) : null}

        {matches.length > 0 ? (
          <section className="mt-10">
            <h3 className="text-lg font-semibold text-foreground">Session history</h3>
            <ul className="mt-4 space-y-2">
              <AnimatePresence initial={false}>
                {matches.map((m) => (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cp-border bg-cp-card/60 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      R{m.roundNumber}: {m.teamAName} {m.scoreA ?? "–"} – {m.scoreB ?? "–"}{" "}
                      {m.teamBName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-cp-muted">
                      {m.durationSeconds != null ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(m.durationSeconds)}
                        </>
                      ) : null}
                      <Badge variant="muted" className="ml-2 capitalize">
                        {m.status.replace("_", " ")}
                      </Badge>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}

        <p className="mt-8 text-center text-xs text-cp-text-dim">
          Reclub matches don&apos;t affect official rankings. Scores are saved as brief activity
          history for community learning.
        </p>
      </div>
    </div>
  );
}
