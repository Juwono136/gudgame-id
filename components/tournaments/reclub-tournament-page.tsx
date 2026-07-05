"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  Clock,
  ExternalLink,
  Gamepad2,
  Info,
  Loader2,
  MapPin,
  Swords,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { FadeInView } from "@/components/motion/fade-in";
import { FunMatchPublicLiveScore } from "@/components/tournaments/fun-match/fun-match-public-live-score";
import { FunMatchPublicBracketTab } from "@/components/tournaments/fun-match/fun-match-public-bracket-tab";
import { FunMatchPublicPlayersTab } from "@/components/tournaments/fun-match/fun-match-public-players-tab";
import { FunMatchPublicHistoryTab } from "@/components/tournaments/fun-match/fun-match-public-history-tab";
import { LiveScoreboard } from "@/components/tournaments/live-scoreboard";
import { TournamentRecentMatchesSection } from "@/components/tournaments/tournament-recent-matches-section";
import { mapLivePayloadToRecentRows } from "@/lib/tournaments/recent-matches";
import { ReclubSquadLobby } from "@/components/tournaments/reclub/reclub-squad-lobby";
import { ReclubSessionStatusBanner } from "@/components/tournaments/reclub/reclub-session-status-banner";
import { ReclubRulesPanel } from "@/components/tournaments/reclub-rules-panel";
import { TournamentParticipantsPanel } from "@/components/tournaments/tournament-participants-panel";
import { TournamentOrganizer } from "@/components/tournaments/tournament-organizer";
import { TournamentShareCard } from "@/components/tournaments/tournament-share-card";
import {
  TournamentDetailPageShell,
  TournamentDetailSection,
  TournamentHeroBanner,
  TournamentStatCard,
  tournamentHeroStyles,
} from "@/components/tournaments/tournament-detail-ui";
import { VenueMapsPreview } from "@/components/tournaments/venue-maps-preview";
import { Badge } from "@/components/ui/badge";
import {
  getTournamentStatusBadgeClass,
  getTournamentTypeBadgeClass,
  tournamentHeroStatusBadgeBase,
} from "@/lib/styles/status-badges";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import {
  useCompleteReclubRound,
  useLeaveReclubTournament,
  useRenameReclubTeam,
  useSwitchTeam,
  useTournamentLobby,
  useUpdateReclubLiveScore,
} from "@/hooks/use-tournament-lobby";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { useReclubSessionPhase } from "@/hooks/use-reclub-session-phase";
import { FunMatchJoinDialog } from "@/components/tournaments/fun-match-join-dialog";
import { TournamentSessionChrome } from "@/components/tournaments/tournament-session-chrome";
import { TournamentBreadcrumbs } from "@/components/tournaments/tournament-breadcrumbs";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { getPhaseLabel } from "@/lib/tournaments/ui/labels";
import { authRoutes, dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";
import {
  getMaxRounds,
  getTournamentCourtCount,
  getTournamentFormatLabel,
  getTournamentPointsPerMatch,
  getTournamentScoringPrimaryLabel,
  getVenueMapsUrl,
} from "@/lib/tournaments/settings";
import { computeReclubSessionStatsWithBracket } from "@/lib/tournaments/stats/from-reclub";
import type { BracketMatchStatsSource } from "@/lib/tournaments/reclub/types";
import {
  getReclubSessionEndedMessage,
  getReclubSessionNotLiveMessage,
} from "@/lib/tournaments/reclub/session-lifecycle";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import {
  buildTournamentParticipantContext,
  type TournamentParticipantContext,
} from "@/lib/tournaments/participant-access";
import { cn } from "@/lib/utils";

const TABS = [
  "Overview",
  "Live Score",
  "Lobby",
  "Players",
  "Bracket",
  "History & stats",
] as const;

type ReclubTournamentPageProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  isAuthenticated: boolean;
  initialUserTeamId?: string | null;
  canManage?: boolean;
  participant?: TournamentParticipantContext;
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
  canManage: canManageProp = false,
  participant: participantProp,
}: ReclubTournamentPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useConfirmDialog();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [publicUrl, setPublicUrl] = useState("");
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinPreselectedTeamId, setJoinPreselectedTeamId] = useState<string | null>(null);
  const handleManageClick = useCallback(() => {
    router.push(publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug));
  }, [router, tournament.sportSlug, tournament.slug]);

  const { data: liveData } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const livePhase =
    liveData?.phase ??
    (tournament.status === "live"
      ? "live"
      : tournament.status === "completed"
        ? "completed"
        : "not_started");
  const liveMessage = liveData?.message;
  const phaseEmptyMessage =
    liveMessage ??
    (livePhase === "completed"
      ? getReclubSessionEndedMessage()
      : livePhase === "not_started"
        ? getReclubSessionNotLiveMessage()
        : null);

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      toast.success("Fun Match created", {
        description: "Share the public page or invite players from the lobby.",
      });
    }
  }, [searchParams]);

  const { data, isLoading, isFetching, refetch } = useTournamentLobby(
    tournament.sportSlug,
    tournament.slug,
  );

  const switchTeam = useSwitchTeam(tournament.sportSlug, tournament.slug);
  const renameTeam = useRenameReclubTeam(tournament.sportSlug, tournament.slug);
  const completeRound = useCompleteReclubRound(tournament.sportSlug, tournament.slug);
  const updateLiveScore = useUpdateReclubLiveScore(tournament.sportSlug, tournament.slug);
  const leaveTournament = useLeaveReclubTournament(tournament.sportSlug, tournament.slug);

  const [joining, setJoining] = useState(false);
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [scoreStatus, setScoreStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");

  const summary = data?.summary ?? initialSummary;
  const teams = data?.teams ?? [];
  const matches = data?.matches ?? [];
  const activeMatches = data?.activeMatches ?? (data?.activeMatch ? [data.activeMatch] : []);
  const activeMatch = activeMatches[0] ?? null;
  const userTeamId = data?.userTeamId ?? initialUserTeamId;
  const canManage = data?.canManage ?? canManageProp;
  const currentUserId = data?.userId ?? null;
  const playersPerTeam = data?.tournament?.playersPerTeam ?? tournament.playersPerTeam;
  const manageUrl = publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug);

  const participant: TournamentParticipantContext = useMemo(
    () =>
      participantProp ??
      data?.participant ??
      buildTournamentParticipantContext({
        userId: currentUserId,
        userTeamId,
        roles: [],
        tournamentCreatedBy: tournament.createdBy,
      }),
    [participantProp, data?.participant, currentUserId, userTeamId, tournament.createdBy],
  );

  const canUseHostControls = participant.canUseHostControls;

  const liveElapsed = useLiveTimer(activeMatch?.startedAt ?? null, Boolean(activeMatch));
  const mapsUrl = getVenueMapsUrl(tournament);
  const maxRounds = getMaxRounds(tournament);
  const isElimination = tournament.format !== "americano";
  const visibleTabs = useMemo(
    () => TABS.filter((item) => isElimination || item !== "Bracket"),
    [isElimination],
  );
  const matchTypeLabel = getTournamentFormatLabel(tournament.format);
  const scoringPrimaryLabel = getTournamentScoringPrimaryLabel(tournament);
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const courtCount = getTournamentCourtCount(tournament);
  const courtCountLive = data?.courts?.length ?? courtCount;
  const scoreSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const sessionPhase = useReclubSessionPhase(tournament);
  const canJoinSession = sessionPhase !== "ended";
  const canPlaySession = sessionPhase === "live";
  const canLeaveSession = Boolean(userTeamId) && sessionPhase !== "ended";

  const busy =
    joining ||
    switchTeam.isPending ||
    completeRound.isPending ||
    renameTeam.isPending ||
    leaveTournament.isPending;

  const completedMatchCount = useMemo(
    () => matches.filter((m) => m.status === "completed").length,
    [matches],
  );

  const sessionStats = useMemo(() => {
    const computed = computeReclubSessionStatsWithBracket({
      reclubMatches: matches,
      bracketMatches: (liveData?.bracket?.matches ?? []) as BracketMatchStatsSource[],
      teams,
      totalPlayers: summary.registeredPlayers,
      maxRounds,
    });
    if (liveData?.playerStats) {
      return {
        ...liveData.playerStats,
        players: computed.players,
      };
    }
    return computed;
  }, [
    liveData?.playerStats,
    liveData?.bracket?.matches,
    matches,
    teams,
    summary.registeredPlayers,
    maxRounds,
  ]);

  const teamScoreByName = useMemo(() => {
    const map: Record<string, { pointsFor: number; wins: number }> = {};
    for (const t of sessionStats.teams) {
      map[t.name] = { pointsFor: t.pointsFor, wins: t.wins };
    }
    return map;
  }, [sessionStats.teams]);

  useEffect(() => {
    setPublicUrl(window.location.href);
  }, []);
  useEffect(() => {
    if (!isElimination && tab === "Bracket") {
      setTab("Overview");
    }
  }, [isElimination, tab]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      const callback = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
      router.push(`${authRoutes.register}?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }
    setJoinPreselectedTeamId(null);
    void refetch();
    setJoinDialogOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      toast.success("Fun Match created");
    }
    if (searchParams.get("join") === "1" && isAuthenticated && !userTeamId) {
      setJoinDialogOpen(true);
    }
  }, [searchParams, isAuthenticated, userTeamId]);

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

  const handleSwitch = async (teamId: string) => {
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

  const handleCompleteRound = async () => {
    if (!activeMatch) return;
    const ok = await confirm({
      title: "End round & save scores?",
      description: "Results will be saved to each player's brief match history.",
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

  const recentRoundRows = useMemo(() => mapLivePayloadToRecentRows(liveData), [liveData]);
  const captainUserIdByTeam = useMemo(
    () =>
      Object.fromEntries(
        teams.map((t) => [t.id, t.members.find((m) => m.role === "captain")?.userId ?? t.members[0]?.userId ?? null]),
      ),
    [teams],
  );

  return (
    <TournamentDetailPageShell>
      <LoadingOverlay show={busy} label="Updating…" />

      {canManage ? (
        <TournamentSessionChrome
          sportSlug={tournament.sportSlug}
          slug={tournament.slug}
          tournamentId={tournament.id}
          name={tournament.name}
          phase={tournament.status === "live" ? "live" : tournament.status === "completed" ? "completed" : "not_started"}
          canManage={canManage}
          canEdit
          editHref={tournamentEditUrl(tournament.id, canManageProp ? "host" : "player")}
          listHref={canManageProp ? dashboardRoutes.hostTournaments : dashboardRoutes.tournaments}
          onManageClick={handleManageClick}
          showCreateActions={isAuthenticated}
          canCreateOfficial={canManageProp}
        />
      ) : null}

      <FunMatchJoinDialog
        open={joinDialogOpen}
        onOpenChange={(open) => {
          setJoinDialogOpen(open);
          if (!open) setJoinPreselectedTeamId(null);
        }}
        sportSlug={tournament.sportSlug}
        slug={tournament.slug}
        maxTeams={data?.tournament.maxTeams ?? tournament.maxTeams}
        playersPerTeam={data?.tournament.playersPerTeam ?? tournament.playersPerTeam}
        squads={teams.map((t) => ({
          id: t.id,
          name: t.name,
          memberCount: t.memberCount,
          maxMembers: tournament.playersPerTeam,
        }))}
        preselectedTeamId={joinPreselectedTeamId}
        userAlreadyInSquad={Boolean(userTeamId)}
        onJoined={() => {
          void refetch();
          router.refresh();
          setTab("Lobby");
        }}
      />

      <TournamentHeroBanner coverImageUrl={tournament.coverImageUrl} variant="reclub">
        <TournamentBreadcrumbs
          sportSlug={tournament.sportSlug}
          sportName={tournament.sportName}
          tournamentName={tournament.name}
          className="mb-3"
        />

        <FadeInView className="mt-5 sm:mt-6">
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("border-0", getTournamentTypeBadgeClass("fun_match"))}>
              <Gamepad2 className="mr-1 h-3 w-3" />
              Fun Match — free play
            </Badge>
            <Badge
              className={cn(
                tournamentHeroStatusBadgeBase,
                getTournamentStatusBadgeClass(tournament.status),
              )}
            >
              {getPhaseLabel(livePhase)}
            </Badge>
            {isFetching && !isLoading ? <Badge variant="muted">Syncing…</Badge> : null}
          </div>

          <h1 className={tournamentHeroStyles.title}>{tournament.name}</h1>

          {tournament.creatorName ? (
            <div className="mt-3 sm:mt-4">
              <TournamentOrganizer
                name={tournament.creatorName}
                imageUrl={tournament.creatorImage}
              />
            </div>
          ) : null}

          {tournament.summary ? (
            <div className={cn(tournamentHeroStyles.summaryWrap, "max-w-3xl")}>
              <RichHtmlContent html={tournament.summary} variant="hero" />
            </div>
          ) : null}

          <div className={tournamentHeroStyles.metaRow}>
            {tournament.venue ? (
              <span className={tournamentHeroStyles.metaItem}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300 sm:mt-0" />
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 break-words text-foreground hover:text-emerald-200"
                  >
                    {tournament.venue}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="break-words">{tournament.venue}</span>
                )}
              </span>
            ) : null}
            {tournament.startsAt ? (
              <span className={tournamentHeroStyles.metaItem}>
                <Calendar className="h-4 w-4 shrink-0 text-emerald-300" />
                {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(tournament.startsAt),
                )}
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <TournamentStatCard icon={Users} label="Players" value={String(summary.registeredPlayers)} tone="hero" />
            <TournamentStatCard icon={Swords} label="Squads" value={String(teams.length)} tone="hero" />
            <TournamentStatCard
              icon={Trophy}
              label={matchTypeLabel}
              value={
                maxRounds != null
                  ? `${completedMatchCount} / ${maxRounds}`
                  : String(completedMatchCount)
              }
              tone="hero"
            />
            <TournamentStatCard
              icon={Users}
              label="Scoring"
              value={scoringPrimaryLabel}
              tone="hero"
            />
          </div>
        </FadeInView>
      </TournamentHeroBanner>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ReclubSessionStatusBanner session={tournament} className="mt-4" />
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
              <p className="mt-2 text-sm font-medium text-foreground">
                {activeMatch.roundLabel ?? "Session in progress"}
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-amber-200/80">
                <Timer className="h-4 w-4 animate-pulse" />
                {formatDuration(liveElapsed)}
              </p>
            </div>
            {canUseHostControls ? (
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
                  }}
                  onScoreBChange={(n) => {
                    const prev = Number(scoreB) || 0;
                    setScoreB(String(n));
                    const action = n > prev ? "increment" : n < prev ? "decrement" : "set";
                    persistLiveScore(Number(scoreA) || 0, n, "b", action);
                  }}
                  disabled={updateLiveScore.isPending}
                  status={scoreStatus}
                  maxScore={pointsPerMatch}
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
            ) : (
              <Badge variant="warning">Match in progress</Badge>
            )}
          </div>
        </motion.div>
      ) : null}

      {/* Tabs */}
      <div className="sticky top-0 z-20 border-b border-cp-border bg-cp-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map((t) => (
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

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "Overview" ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:gap-8">
                <div className="order-2 min-w-0 space-y-6 lg:order-1">
                  {tournament.description ? (
                    <TournamentDetailSection
                      title="About this session"
                      icon={Info}
                      iconClassName="text-emerald-400"
                    >
                      <RichHtmlContent html={tournament.description} variant="article" />
                    </TournamentDetailSection>
                  ) : null}
                  {tournament.venue ? (
                    <VenueMapsPreview venue={tournament.venue} mapsUrl={mapsUrl} />
                  ) : null}
                  <TournamentRecentMatchesSection
                    variant="reclub"
                    rows={recentRoundRows}
                    onViewAll={() => setTab("History & stats")}
                  />
                  {tournament.rules ? (
                    <ReclubRulesPanel rulesHtml={tournament.rules} />
                  ) : null}
                  <p className="text-center text-xs text-cp-text-dim">
                    Fun Match scores don&apos;t affect official rankings. Scores appear in brief match
                    history.
                  </p>
                </div>
                <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
                  <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
                    <h3 className="font-semibold text-foreground">Join session</h3>
                    <p className="mt-1 text-sm text-cp-muted">
                      {summary.registeredPlayers} players · {teams.length} squads
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs text-cp-muted">
                      <div className="flex justify-between gap-3 rounded-lg bg-cp-elevated/30 px-3 py-2">
                        <dt>Match type</dt>
                        <dd className="font-medium text-foreground">{matchTypeLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3 rounded-lg bg-cp-elevated/30 px-3 py-2">
                        <dt>Scoring</dt>
                        <dd className="font-medium text-foreground">{scoringPrimaryLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3 rounded-lg bg-cp-elevated/30 px-3 py-2">
                        <dt>Courts</dt>
                        <dd className="font-medium text-foreground">{courtCountLive}</dd>
                      </div>
                    </dl>
                    {!userTeamId && canJoinSession ? (
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
                    ) : !userTeamId && sessionPhase === "ended" ? (
                      <p className="mt-4 rounded-lg border border-cp-border bg-cp-elevated/40 px-3 py-2.5 text-xs leading-relaxed text-cp-muted">
                        {getReclubSessionEndedMessage()}
                      </p>
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

            {tab === "Live Score" ? (
              <FunMatchPublicLiveScore
                tournament={tournament}
                liveData={liveData}
                teams={teams}
              />
            ) : null}

            {tab === "Lobby" ? (
              <div className="space-y-6">
                <ReclubSquadLobby
                  teams={teams}
                  playersPerTeam={playersPerTeam}
                  maxTeams={data?.tournament.maxTeams ?? tournament.maxTeams}
                  session={tournament}
                  userTeamId={userTeamId}
                  currentUserId={currentUserId}
                  activeMatch={Boolean(activeMatch)}
                  canManage={canManage}
                  isLoading={isLoading}
                  onJoinClick={(teamId) => {
                    setJoinPreselectedTeamId(teamId ?? null);
                    void refetch();
                    setJoinDialogOpen(true);
                  }}
                  onSwitchTeam={(teamId) => void handleSwitch(teamId)}
                  onRenameTeam={(teamId, name) => renameTeam.mutateAsync({ teamId, name })}
                  canLeave={canLeaveSession}
                  onLeave={() => void handleLeave()}
                  leaving={leaveTournament.isPending}
                  renamingTeamId={
                    renameTeam.isPending ? renameTeam.variables?.teamId ?? null : null
                  }
                  captainUserIdByTeam={captainUserIdByTeam}
                />

                {canManage && canPlaySession && !activeMatch && teams.filter((t) => t.memberCount > 0).length >= 2 ? (
                  <section className="rounded-2xl border border-cp-border bg-cp-elevated/30 px-4 py-4 sm:px-5">
                    <p className="text-sm text-cp-muted">
                      Host controls — start rounds, assign courts, and update scores from{" "}
                      <Link
                        href={`${manageUrl}?section=scoring`}
                        className="font-medium text-emerald-400 hover:underline"
                      >
                        Manage tournament → Live scoring
                      </Link>
                      .
                    </p>
                  </section>
                ) : canManage && sessionPhase === "upcoming" ? (
                  <p className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm text-sky-200/90">
                    {phaseEmptyMessage ?? getReclubSessionNotLiveMessage()}
                  </p>
                ) : canManage && sessionPhase === "ended" ? (
                  <p className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-sm text-cp-muted">
                    {getReclubSessionEndedMessage()}
                  </p>
                ) : null}
              </div>
            ) : null}

            {tab === "Players" ? (
              <FunMatchPublicPlayersTab
                tournament={tournament}
                liveData={liveData}
                teams={teams}
              />
            ) : null}

            {tab === "Bracket" ? (
              <FunMatchPublicBracketTab
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                userTeamId={userTeamId}
              />
            ) : null}

            {tab === "History & stats" ? (
              <FunMatchPublicHistoryTab
                tournament={tournament}
                liveData={liveData}
                teams={teams}
                userTeamId={userTeamId}
                isElimination={isElimination}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </TournamentDetailPageShell>
  );
}
