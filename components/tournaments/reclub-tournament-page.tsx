"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  Clock,
  ExternalLink,
  Gamepad2,
  Info,
  Loader2,
  LogOut,
  MapPin,
  Play,
  Swords,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { FadeInView } from "@/components/motion/fade-in";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import {
  ReclubMatchHistoryPanel,
  ReclubMatchOverviewPreview,
} from "@/components/tournaments/reclub-match-history";
import { ReclubBracketPanel } from "@/components/tournaments/reclub-bracket-panel";
import { ReclubLobbyDnd } from "@/components/tournaments/reclub-lobby-dnd";
import { ReclubRulesPanel } from "@/components/tournaments/reclub-rules-panel";
import { TournamentOrganizer } from "@/components/tournaments/tournament-organizer";
import { TournamentShareCard } from "@/components/tournaments/tournament-share-card";
import { VenueMapsPreview } from "@/components/tournaments/venue-maps-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import {
  useCompleteReclubRound,
  useCreateReclubTeam,
  useLeaveReclubTournament,
  useRenameReclubTeam,
  useStartReclubRound,
  useSwitchTeam,
  useTournamentLobby,
  useUpdateReclubLiveScore,
} from "@/hooks/use-tournament-lobby";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getMaxRounds, getVenueMapsUrl } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Lobby", "Bracket", "History", "Stats"] as const;

type ReclubTournamentPageProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  isAuthenticated: boolean;
  initialUserTeamId?: number | null;
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

export function ReclubTournamentPage({
  tournament,
  summary: initialSummary,
  isAuthenticated,
  initialUserTeamId = null,
}: ReclubTournamentPageProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [publicUrl, setPublicUrl] = useState("");

  const { data, isLoading, isFetching, refetch } = useTournamentLobby(
    tournament.sportSlug,
    tournament.slug,
  );

  const switchTeam = useSwitchTeam(tournament.sportSlug, tournament.slug);
  const createTeam = useCreateReclubTeam(tournament.sportSlug, tournament.slug);
  const renameTeam = useRenameReclubTeam(tournament.sportSlug, tournament.slug);
  const startRound = useStartReclubRound(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);
  const updateLiveScore = useUpdateReclubLiveScore(tournament.sportSlug, tournament.slug);
  const leaveTournament = useLeaveReclubTournament(tournament.sportSlug, tournament.slug);

  const [joining, setJoining] = useState(false);
  const [teamAId, setTeamAId] = useState<number | "">("");
  const [teamBId, setTeamBId] = useState<number | "">("");
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
  const mapsUrl = getVenueMapsUrl(tournament);
  const maxRounds = getMaxRounds(tournament);
  const completedRounds = matches.filter((m) => m.status === "completed").length;
  const roundsRemaining =
    maxRounds != null ? Math.max(0, maxRounds - completedRounds - (activeMatch ? 1 : 0)) : null;
  const scoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoresRef = useRef({ a: 0, b: 0 });

  useEffect(() => {
    if (activeMatch) {
      setScoreA(String(activeMatch.scoreA ?? 0));
      setScoreB(String(activeMatch.scoreB ?? 0));
    }
  }, [activeMatch?.id, activeMatch?.scoreA, activeMatch?.scoreB]);

  const persistLiveScore = useCallback(
    (a: number, b: number, side?: "a" | "b", action?: "increment" | "decrement" | "set") => {
      if (!activeMatch || !canManage) return;
      if (scoreSyncRef.current) clearTimeout(scoreSyncRef.current);
      scoreSyncRef.current = setTimeout(() => {
        updateLiveScore.mutate({
          matchId: activeMatch.id,
          scoreA: a,
          scoreB: b,
          side,
          action: action ?? "set",
        });
      }, 400);
    },
    [activeMatch, canManage, updateLiveScore],
  );

  const canLeaveSession =
    Boolean(userTeamId) &&
    tournament.status !== "completed" &&
    tournament.status !== "cancelled";

  const busy =
    joining ||
    switchTeam.isPending ||
    startRound.isPending ||
    completeRound.isPending ||
    renameTeam.isPending ||
    leaveTournament.isPending;

  const stats = useMemo(() => {
    const completed = matches.filter((m) => m.status === "completed");
    const teamWins = new Map<string, number>();
    for (const m of completed) {
      if ((m.scoreA ?? 0) > (m.scoreB ?? 0) && m.teamAName) {
        teamWins.set(m.teamAName, (teamWins.get(m.teamAName) ?? 0) + 1);
      }
      if ((m.scoreB ?? 0) > (m.scoreA ?? 0) && m.teamBName) {
        teamWins.set(m.teamBName, (teamWins.get(m.teamBName) ?? 0) + 1);
      }
    }
    const leaderboard = [...teamWins.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    return {
      totalRounds: completed.length,
      activeSquads: teams.filter((t) => t.memberCount > 0).length,
      leaderboard,
    };
  }, [matches, teams]);

  useEffect(() => {
    setPublicUrl(window.location.href);
  }, []);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      const callback = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
      router.push(`${authRoutes.register}?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }
    const ok = await confirm({
      title: "Join this reclub session?",
      description: "You'll be placed on a squad. Switch freely until a round starts.",
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
      setTab("Lobby");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Join failed");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    const ok = await confirm({
      title: "Leave this session?",
      description:
        "You'll be removed from your squad. You can rejoin later if slots are available.",
      confirmLabel: "Leave session",
      cancelLabel: "Stay",
      variant: "destructive",
    });
    if (!ok) return;
    leaveTournament.mutate(undefined, {
      onSuccess: () => {
        void refetch();
        router.refresh();
        setTab("Overview");
      },
    });
  };

  const handleSwitch = async (teamId: number) => {
    if (activeMatch) {
      toast.error("Cannot switch squads during an active round");
      return;
    }
    const ok = await confirm({
      title: "Switch to this squad?",
      description: "Your slot will move to the selected squad.",
      confirmLabel: "Switch",
      cancelLabel: "Stay",
    });
    if (!ok) return;
    switchTeam.mutate(teamId);
  };

  const handleStartRound = async () => {
    if (teamAId === "" || teamBId === "") {
      toast.error("Select two squads");
      return;
    }
    const ok = await confirm({
      title: "Start this round?",
      description: "Squads lock until the round ends.",
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
      description: "Results will be saved to each player's brief match history.",
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

  const teamOptions = useMemo(() => teams.filter((t) => t.memberCount > 0), [teams]);
  const canRenameTeams = !activeMatch && tournament.status !== "live" && tournament.status !== "completed";

  return (
    <div className="min-h-screen bg-cp-bg">
      <LoadingOverlay show={busy} label="Updating…" />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-cp-border">
        {tournament.coverImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={tournament.coverImageUrl}
              alt=""
              fill
              className="object-cover opacity-35"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-linear-to-b from-emerald-950/40 via-cp-bg/85 to-cp-bg" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-linear-to-b from-emerald-950/50 via-cp-card/80 to-cp-bg" />
        )}

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          <Link
            href={publicSportRoutes.tournaments(tournament.sportSlug)}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {tournament.sportName} tournaments
          </Link>

          <FadeInView className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-0 bg-emerald-500/25 text-emerald-200">
                <Gamepad2 className="mr-1 h-3 w-3" />
                Reclub — free play
              </Badge>
              <Badge className="border-cp-border bg-cp-elevated uppercase">{tournament.status}</Badge>
              {isFetching && !isLoading ? <Badge variant="muted">Syncing…</Badge> : null}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {tournament.name}
            </h1>

            {tournament.creatorName ? (
              <div className="mt-4">
                <TournamentOrganizer
                  name={tournament.creatorName}
                  imageUrl={tournament.creatorImage}
                />
              </div>
            ) : null}

            {tournament.summary ? (
              <div className="mt-3 max-w-3xl">
                <RichHtmlContent html={tournament.summary} variant="article" />
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-cp-muted">
              {tournament.venue ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-foreground hover:text-emerald-300"
                    >
                      {tournament.venue}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    tournament.venue
                  )}
                </span>
              ) : null}
              {tournament.startsAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0 text-emerald-400" />
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(tournament.startsAt),
                  )}
                </span>
              ) : null}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={Users} label="Players" value={String(summary.registeredPlayers)} />
              <StatCard icon={Swords} label="Squads" value={String(teams.length)} />
              <StatCard
                icon={Trophy}
                label="Rounds"
                value={
                  maxRounds != null
                    ? `${stats.totalRounds} / ${maxRounds}`
                    : String(stats.totalRounds)
                }
              />
              <StatCard
                icon={Users}
                label="Per squad"
                value={`${tournament.playersPerTeam} max`}
              />
            </div>
          </FadeInView>
        </div>
      </div>

      {/* Live round banner */}
      {activeMatch ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-amber-500/30 bg-linear-to-r from-amber-950/50 to-cp-card"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Live round {activeMatch.roundNumber}
              </p>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                {activeMatch.teamAName} vs {activeMatch.teamBName}
              </h2>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-amber-200/80">
                <Timer className="h-4 w-4 animate-pulse" />
                {formatDuration(liveElapsed)}
              </p>
            </div>
            {canManage ? (
              <div className="w-full max-w-xl space-y-4">
                <LiveScoreboard
                  teamAName={activeMatch.teamAName ?? "Squad A"}
                  teamBName={activeMatch.teamBName ?? "Squad B"}
                  scoreA={Number(scoreA) || 0}
                  scoreB={Number(scoreB) || 0}
                  onScoreAChange={(n) => {
                    const prev = Number(scoreA) || 0;
                    setScoreA(String(n));
                    const action = n > prev ? "increment" : n < prev ? "decrement" : "set";
                    persistLiveScore(n, Number(scoreB) || 0, "a", action);
                    prevScoresRef.current = { a: n, b: Number(scoreB) || 0 };
                  }}
                  onScoreBChange={(n) => {
                    const prev = Number(scoreB) || 0;
                    setScoreB(String(n));
                    const action = n > prev ? "increment" : n < prev ? "decrement" : "set";
                    persistLiveScore(Number(scoreA) || 0, n, "b", action);
                    prevScoresRef.current = { a: Number(scoreA) || 0, b: n };
                  }}
                  disabled={updateLiveScore.isPending}
                />
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-500 sm:w-auto"
                  onClick={() => void handleCompleteRound()}
                  disabled={completeRound.isPending}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  End match now
                </Button>
              </div>
            ) : activeMatch.scoreA != null || activeMatch.scoreB != null ? (
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                  {activeMatch.scoreA ?? 0} : {activeMatch.scoreB ?? 0}
                </p>
                <p className="mt-1 text-xs text-cp-muted">Live score</p>
              </div>
            ) : (
              <Badge className="border-amber-500/50 bg-amber-500/10 text-amber-300">Match in progress</Badge>
            )}
          </div>
        </motion.div>
      ) : null}

      {/* Tabs */}
      <div className="sticky top-0 z-20 border-b border-cp-border bg-cp-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                tab === t
                  ? "border-emerald-500 text-emerald-300"
                  : "border-transparent text-cp-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "Overview" ? (
              <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                  {tournament.description ? (
                    <section className="rounded-2xl border border-cp-border bg-cp-card p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Info className="h-5 w-5 text-emerald-400" />
                        About this session
                      </h2>
                      <RichHtmlContent html={tournament.description} variant="article" className="mt-4" />
                    </section>
                  ) : null}
                  {tournament.venue ? (
                    <VenueMapsPreview
                      venue={tournament.venue}
                      mapsUrl={mapsUrl}
                    />
                  ) : null}
                  <ReclubMatchOverviewPreview
                    matches={matches}
                    onViewAll={() => setTab("History")}
                  />
                  {tournament.rules ? (
                    <ReclubRulesPanel rulesHtml={tournament.rules} />
                  ) : null}
                  <p className="text-center text-xs text-cp-text-dim">
                    Reclub matches don&apos;t affect official rankings. Scores appear in brief match
                    history.
                  </p>
                </div>
                <aside className="space-y-4">
                  <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
                    <h3 className="font-semibold text-foreground">Join session</h3>
                    <p className="mt-1 text-sm text-cp-muted">
                      {summary.registeredPlayers} players · {teams.length} squads
                    </p>
                    {!userTeamId && tournament.status !== "completed" ? (
                      <Button
                        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500"
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
                      <Button
                        variant="outline"
                        className="mt-4 w-full border-emerald-500/40"
                        onClick={() => setTab("Lobby")}
                      >
                        Go to your squad
                      </Button>
                    ) : null}
                  </div>
                  {publicUrl ? (
                    <TournamentShareCard url={publicUrl} tournamentName={tournament.name} />
                  ) : null}
                </aside>
              </div>
            ) : null}

            {tab === "Lobby" ? (
              <div>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Team lobby</h2>
                    <p className="text-sm text-cp-muted">
                      Drag your avatar to switch squads · rename before play starts
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {userTeamId ? (
                      <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                        You&apos;re on a squad
                      </Badge>
                    ) : null}
                    {canLeaveSession ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        disabled={leaveTournament.isPending}
                        onClick={() => void handleLeave()}
                      >
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                        Leave session
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <LoadingSpinner label="Loading lobby…" />
                  </div>
                ) : (
                  <ReclubLobbyDnd
                    teams={teams}
                    playersPerTeam={tournament.playersPerTeam}
                    maxTeams={data?.tournament.maxTeams ?? tournament.maxTeams}
                    userTeamId={userTeamId}
                    currentUserId={currentUserId}
                    activeMatch={Boolean(activeMatch)}
                    canRenameTeams={canRenameTeams}
                    canManage={canManage}
                    onSwitchTeam={(teamId) => void handleSwitch(teamId)}
                    onCreateTeam={(name) => createTeam.mutate(name)}
                    onRenameTeam={(teamId, name) => renameTeam.mutate({ teamId, name })}
                    canLeave={canLeaveSession}
                    onLeave={() => void handleLeave()}
                    leaving={leaveTournament.isPending}
                    creating={createTeam.isPending}
                    renaming={renameTeam.isPending}
                  />
                )}

                {canManage && !activeMatch && teamOptions.length >= 2 ? (
                  <section className="mt-10 rounded-2xl border border-cp-border bg-cp-card p-6">
                    <h3 className="font-semibold text-foreground">Host controls</h3>
                    <p className="mt-1 text-sm text-cp-muted">
                      Pick two squads and start the next round.
                      {maxRounds != null ? (
                        <span className="mt-1 block text-cp-muted">
                          {roundsRemaining === 0
                            ? "All rounds for this session have been played."
                            : `${roundsRemaining} round${roundsRemaining === 1 ? "" : "s"} remaining of ${maxRounds}.`}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <TeamSelect label="Squad A" value={teamAId} onChange={setTeamAId} teams={teamOptions} exclude={teamBId} />
                      <TeamSelect label="Squad B" value={teamBId} onChange={setTeamBId} teams={teamOptions} exclude={teamAId} />
                      <Button
                        className="bg-cp-primary hover:bg-cp-primary-light"
                        disabled={startRound.isPending || roundsRemaining === 0}
                        onClick={() => void handleStartRound()}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start round
                      </Button>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            {tab === "Bracket" ? (
              <ReclubBracketPanel
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                tournamentId={tournament.id}
                teams={teams}
                canManage={canManage}
                userTeamId={userTeamId}
                tournamentStatus={tournament.status}
              />
            ) : null}

            {tab === "History" ? (
              <ReclubMatchHistoryPanel
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
              />
            ) : null}

            {tab === "Stats" ? (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Session stats
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <StatCard icon={Trophy} label="Completed rounds" value={String(stats.totalRounds)} />
                  <StatCard icon={Users} label="Active squads" value={String(stats.activeSquads)} />
                  <StatCard icon={Users} label="Total players" value={String(summary.registeredPlayers)} />
                </div>
                {stats.leaderboard.length > 0 ? (
                  <div className="mt-6 rounded-2xl border border-cp-border bg-cp-card p-5">
                    <h3 className="text-sm font-semibold text-foreground">Squad wins</h3>
                    <ul className="mt-3 space-y-2">
                      {stats.leaderboard.map(([name, wins], i) => (
                        <li key={name} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            <span className="mr-2 text-cp-muted">#{i + 1}</span>
                            {name}
                          </span>
                          <span className="font-semibold text-emerald-400">{wins}W</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-cp-muted">Stats appear after rounds are completed.</p>
                )}
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-cp-border/80 bg-cp-card/60 px-4 py-3">
      <Icon className="h-4 w-4 text-emerald-400" />
      <p className="mt-2 text-xs text-cp-muted">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-cp-muted">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-20 border-cp-border bg-cp-bg-input"
      />
    </div>
  );
}

function TeamSelect({
  label,
  value,
  onChange,
  teams,
  exclude,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  teams: { id: number; name: string; memberCount: number }[];
  exclude: number | "";
}) {
  return (
    <div className="min-w-[140px] flex-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
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
