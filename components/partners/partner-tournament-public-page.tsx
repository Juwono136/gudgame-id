"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Radio,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { TournamentAddToCalendar } from "@/components/tournaments/tournament-add-to-calendar";
import { TournamentCountdown } from "@/components/tournaments/tournament-countdown";
import { TournamentHeroVenueLink } from "@/components/tournaments/tournament-hero-venue-link";
import { TournamentShareCard } from "@/components/tournaments/tournament-share-card";
import { TournamentSessionChrome } from "@/components/tournaments/tournament-session-chrome";
import { TournamentVenueMapPreview } from "@/components/tournaments/form/tournament-venue-map-preview";
import { FunMatchPublicLiveScore } from "@/components/tournaments/fun-match/fun-match-public-live-score";
import { FunMatchPublicPlayersTab } from "@/components/tournaments/fun-match/fun-match-public-players-tab";
import { DoubleStageGroupsTab } from "@/components/tournaments/official/double-stage-groups-tab";
import { DoubleStageMatchesTab } from "@/components/tournaments/official/double-stage-matches-tab";
import { OfficialPublicBracketTab } from "@/components/tournaments/official/official-public-bracket-tab";
import { OfficialPublicHistoryStatsTab } from "@/components/tournaments/official/official-public-history-stats-tab";
import { OfficialPublicPlayersTab } from "@/components/tournaments/official/official-public-players-tab";
import { PublicMultiCourtLiveScore } from "@/components/tournaments/public/public-multi-court-live-score";
import { TournamentLiveBanner } from "@/components/tournaments/public/tournament-live-banner";
import {
  TournamentDetailPageShell,
  TournamentHeroBanner,
  TournamentTabNav,
  tournamentHeroStyles,
} from "@/components/tournaments/tournament-detail-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FadeInView } from "@/components/motion/fade-in";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { useTournamentLobby } from "@/hooks/use-tournament-lobby";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import { hasPublicBracketTree } from "@/lib/tournaments/brackets/has-public-bracket";
import { groupHistoryEntryToReclubView } from "@/lib/tournaments/double-stage/view-mappers";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import { liveMatchesToReclubViews } from "@/lib/tournaments/reclub/live-match-mappers";
import { dedupeReclubMatchViews } from "@/lib/tournaments/reclub/round-groups";
import {
  getTournamentDisplayConfig,
  getTournamentFormatLabel,
  getTournamentScoringDetailLabel,
  getTournamentScoringPrimaryLabel,
  getVenueMapsUrl,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  computeReclubSessionStats,
  computeReclubSessionStatsWithBracket,
} from "@/lib/tournaments/stats/from-reclub";
import {
  buildOfficialTeamsFromLivePlayers,
  buildOfficialTeamsFromParticipants,
  enrichOfficialTeamsFromBracket,
  mergeOfficialTeams,
} from "@/lib/tournaments/stats/build-official-teams";
import {
  mapBracketMatchesToHistoryItems,
  mapLiveHistoryToRoundItems,
  mapReclubMatchesToHistoryItems,
  mergeHistoryItems,
} from "@/lib/tournaments/stats/map-history-items";
import {
  getTournamentStatusBadgeClass,
  statusBadgeClass,
} from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

/** Client-safe re-implementation of computeRegistrationOpen (that helper is server-only). */
function isPartnerRegistrationOpen(tournament: TournamentDetail): boolean {
  if (
    tournament.status === "completed" ||
    tournament.status === "cancelled" ||
    tournament.status === "draft"
  ) {
    return false;
  }

  const now = Date.now();
  if (tournament.registrationOpensAt && now < new Date(tournament.registrationOpensAt).getTime()) {
    return false;
  }

  const closesAt = tournament.registrationClosesAt ?? tournament.endsAt;
  if (closesAt && now >= new Date(closesAt).getTime()) {
    return false;
  }

  return true;
}

function formatDateRange(starts: string | null, ends: string | null) {
  if (!starts) return null;
  const start = new Date(starts);
  if (Number.isNaN(start.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (!ends) return start.toLocaleString(undefined, opts);
  const end = new Date(ends);
  if (Number.isNaN(end.getTime())) return start.toLocaleString(undefined, opts);
  return `${start.toLocaleString(undefined, opts)} – ${end.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatIdr(amount: number | null | undefined) {
  if (amount == null || amount <= 0) return "Free";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Aligned with partner manage sections (Groups / Matches / Bracket). */
const TABS = [
  "Overview",
  "Live Score",
  "Players",
  "Groups",
  "Matches",
  "Bracket",
  "History & stats",
] as const;
type PartnerPublicTab = (typeof TABS)[number];

type PartnerTournamentPublicPageProps = {
  partnerSlug: string;
  partnerName: string;
  tournament: TournamentDetail;
  participant: TournamentParticipantContext;
  canManage: boolean;
  canEdit?: boolean;
};

function InfoCard({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: typeof Trophy;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-cp-primary">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className="mt-3 break-words text-lg font-bold tracking-tight text-foreground sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-cp-muted">{hint}</p>
    </div>
  );
}

export function PartnerTournamentPublicPage({
  partnerSlug,
  partnerName,
  tournament,
  participant,
  canManage,
  canEdit = false,
}: PartnerTournamentPublicPageProps) {
  const { data: liveData } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const { data: lobbyData, isLoading: lobbyLoading } = useTournamentLobby(
    tournament.sportSlug,
    tournament.slug,
  );
  const caps = getFormatCapabilities(tournament);
  const livePhase = liveData?.doubleStage?.phase;
  const isDoubleStageKnockout =
    caps.isDoubleStage &&
    (livePhase === "knockout" || (livePhase == null && !caps.hasGroupStage));
  const isElimination = caps.hasBracket || isDoubleStageKnockout;
  const bracketHasTree = hasPublicBracketTree(
    liveData?.bracket as { generated?: boolean; matches?: unknown[] } | undefined,
  );

  const { data: bracket, isLoading: bracketLoading } = useTournamentBracket(
    tournament.sportSlug,
    tournament.slug,
    { enabled: caps.showBracketTab || caps.isDoubleStage },
  );
  const { data: participantsData } = useTournamentParticipants(
    tournament.sportSlug,
    tournament.slug,
    1,
    100,
    { enabled: !caps.isAmericano },
  );

  const visibleTabs = useMemo((): PartnerPublicTab[] => {
    return TABS.filter((item) => {
      // Groups = pool standings (manage → Groups)
      if (item === "Groups" && !caps.showGroupsTab) return false;
      // Matches schedule only for double-stage partner events
      if (item === "Matches" && !caps.isDoubleStage) return false;
      if (item === "Bracket") {
        if (!caps.showBracketTab) return false;
        if (caps.isDoubleStage && !isDoubleStageKnockout && !bracketHasTree) return false;
      }
      return true;
    });
  }, [caps, bracketHasTree, isDoubleStageKnockout]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PartnerPublicTab>("Overview");

  const manageHref = partnerPublicRoutes.tournamentManage(partnerSlug, tournament.slug);
  const displayHref = partnerPublicRoutes.tournamentDisplay(partnerSlug, tournament.slug);
  const registerHref = partnerPublicRoutes.tournamentRegister(partnerSlug, tournament.slug);
  const publicUrl = partnerPublicRoutes.tournament(partnerSlug, tournament.slug);

  const navigateTab = useCallback(
    (next: PartnerPublicTab) => {
      if (!visibleTabs.includes(next)) return;
      setTab(next);
      const url =
        next === "Overview"
          ? publicUrl
          : `${publicUrl}?tab=${encodeURIComponent(next)}`;
      router.replace(url, { scroll: false });
    },
    [publicUrl, router, visibleTabs],
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const normalized =
      tabParam === "Stats"
        ? ("History & stats" as PartnerPublicTab)
        : (tabParam as PartnerPublicTab | null);
    const valid = new Set(visibleTabs);
    if (normalized && valid.has(normalized)) {
      setTab(normalized);
      return;
    }
    if (!tabParam) {
      setTab("Overview");
    }
  }, [searchParams, visibleTabs]);

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab("Overview");
    }
  }, [tab, visibleTabs]);

  const displayStatus = liveData?.tournament.status ?? tournament.status;
  const formatLabel = getTournamentFormatLabel(tournament.format);
  const registrationOpen = isPartnerRegistrationOpen(tournament);
  const venueMapsUrl = getVenueMapsUrl(tournament) ?? "";
  const isPaidRegistration =
    tournament.officialBilling === "paid" && (tournament.registrationFeeIdr ?? 0) > 0;
  const feeLabel = isPaidRegistration
    ? formatIdr(tournament.registrationFeeIdr)
    : "Free";
  const prizeLabel =
    tournament.prizePoolIdr != null && tournament.prizePoolIdr > 0
      ? formatIdr(tournament.prizePoolIdr)
      : null;
  // Prefer live payload so Manage → Display brand theme updates appear without a full reload.
  const brandTheme =
    liveData?.displayConfig?.brandTheme ??
    getTournamentDisplayConfig(tournament).brandTheme;
  const eventPrimary = brandTheme?.primaryColor?.trim() || undefined;
  const eventAccent = brandTheme?.accentColor?.trim() || eventPrimary;
  const scoringPrimary = getTournamentScoringPrimaryLabel(tournament);
  const scoringDetail = getTournamentScoringDetailLabel(tournament);

  const registeredTeams =
    lobbyData?.summary.registeredTeams ?? participantsData?.teamCount ?? 0;
  const registeredPlayers =
    lobbyData?.summary.registeredPlayers ?? participantsData?.total ?? 0;
  const maxTeams = tournament.maxTeams;
  const spotsRemaining =
    maxTeams != null ? Math.max(0, maxTeams - registeredTeams) : null;
  const capacityRatio =
    maxTeams && maxTeams > 0 ? Math.min(1, registeredTeams / maxTeams) : 0;

  const lobbyTeams = lobbyData?.teams ?? [];

  const officialTeams = useMemo(() => {
    if (caps.isAmericano) return lobbyTeams;
    const fromParticipants = buildOfficialTeamsFromParticipants(
      (participantsData?.items ?? []).map((item) => ({
        userId: item.userId,
        displayName: item.displayName,
        image: item.image,
        role: item.role,
        teamId: item.teamId,
        teamName: item.teamName,
      })),
    );
    const fromLive = buildOfficialTeamsFromLivePlayers(liveData?.players ?? []);
    const merged = mergeOfficialTeams(fromParticipants, fromLive);
    return enrichOfficialTeamsFromBracket(merged, bracket?.matches ?? []);
  }, [
    bracket?.matches,
    caps.isAmericano,
    liveData?.players,
    lobbyTeams,
    participantsData?.items,
  ]);

  const officialReclubMatches = useMemo(() => {
    if (caps.isDoubleStage) {
      const fromHistory = (liveData?.matchHistory ?? [])
        .filter((entry) => entry.playType === "group_stage")
        .map(groupHistoryEntryToReclubView);
      const fromLive = liveData
        ? liveMatchesToReclubViews({
            ...liveData,
            matches: (liveData.matches ?? []).filter((m) => m.type === "group_stage"),
          })
        : [];
      return dedupeReclubMatchViews([...fromHistory, ...fromLive]);
    }
    if (isElimination) return [];
    return lobbyData?.matches ?? [];
  }, [caps.isDoubleStage, isElimination, liveData, lobbyData?.matches]);

  const officialBracketMatches = bracket?.matches ?? [];

  const sessionStats = useMemo(() => {
    if (liveData?.playerStats) return liveData.playerStats;
    if (caps.isDoubleStage) {
      return computeReclubSessionStatsWithBracket({
        reclubMatches: officialReclubMatches,
        bracketMatches: officialBracketMatches,
        teams: officialTeams,
        totalPlayers: lobbyData?.summary.registeredPlayers ?? officialTeams.length * 2,
        maxRounds: null,
      });
    }
    return computeReclubSessionStats({
      matches: lobbyData?.matches ?? [],
      teams: lobbyTeams,
      totalPlayers: lobbyData?.summary.registeredPlayers ?? lobbyTeams.length * 2,
      maxRounds: null,
    });
  }, [
    caps.isDoubleStage,
    liveData?.playerStats,
    lobbyData?.matches,
    lobbyData?.summary.registeredPlayers,
    lobbyTeams,
    officialBracketMatches,
    officialReclubMatches,
    officialTeams,
  ]);

  const historyItems = useMemo(() => {
    const fromLive = mapLiveHistoryToRoundItems(liveData?.matchHistory ?? []);
    const fromBracket = mapBracketMatchesToHistoryItems(officialBracketMatches);
    const fromReclub = mapReclubMatchesToHistoryItems(
      caps.isAmericano ? (lobbyData?.matches ?? []) : officialReclubMatches,
    );
    return mergeHistoryItems(fromLive, fromBracket, fromReclub);
  }, [
    caps.isAmericano,
    liveData?.matchHistory,
    lobbyData?.matches,
    officialBracketMatches,
    officialReclubMatches,
  ]);

  const liveScoreMode = caps.isDoubleStage && !isDoubleStageKnockout ? "group_stage" : "rounds";

  const bannerMatches = useMemo(() => {
    const courts = liveData?.courts ?? lobbyData?.courts ?? [];
    const fromLive =
      liveData?.matches?.filter(
        (m) =>
          isMatchLiveForTournament(m.status, liveData?.tournament.status) &&
          m.teamAName &&
          m.teamBName,
      ) ?? [];
    return fromLive.map((m) => ({
      id: m.id,
      courtLabel: resolveCourtLabel(m.courtId, courts),
      teamAName: m.teamAName ?? "Team A",
      teamBName: m.teamBName ?? "Team B",
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      roundNumber: m.roundNumber,
    }));
  }, [liveData, lobbyData?.courts]);

  return (
    <div
      style={
        eventPrimary
          ? ({
              ["--cp-primary" as string]: eventPrimary,
              ["--cp-primary-light" as string]: eventAccent ?? eventPrimary,
              ["--partner-accent" as string]: eventAccent ?? eventPrimary,
              ["--ring" as string]: eventPrimary,
            } as React.CSSProperties)
          : undefined
      }
    >
    <TournamentDetailPageShell>
      {canManage ? (
        <TournamentSessionChrome
          sportSlug={tournament.sportSlug}
          slug={tournament.slug}
          tournamentId={tournament.id}
          name={tournament.name}
          phase={
            displayStatus === "live"
              ? "live"
              : displayStatus === "completed"
                ? "completed"
                : "not_started"
          }
          canManage
          canEdit={canEdit}
          editHref={canEdit ? dashboardRoutes.partnerTournamentEdit(tournament.id) : undefined}
          listHref={partnerPublicRoutes.tournaments(partnerSlug)}
          backLabel="Tournaments"
          publicUrl={publicUrl}
          displayUrl={displayHref}
          manageUrl={manageHref}
          showCreateActions={false}
        />
      ) : null}

      <TournamentHeroBanner
        coverImageUrl={tournament.coverImageUrl}
        variant="official"
        contentClassName="max-w-7xl px-3 sm:px-6 lg:px-8"
      >
        <Link
          href={partnerPublicRoutes.tournaments(partnerSlug)}
          className={tournamentHeroStyles.backLink}
        >
          <ArrowLeft className="mr-1.5 inline h-4 w-4" />
          {partnerName} tournaments
        </Link>

        <FadeInView className="mt-5 flex flex-col gap-6 sm:mt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {tournament.categoryLabel ? (
                <Badge
                  className={cn(statusBadgeClass.accent, tournamentHeroStyles.statusBadge)}
                >
                  {tournament.categoryLabel}
                </Badge>
              ) : null}
              <Badge
                className={cn(
                  getTournamentStatusBadgeClass(displayStatus),
                  tournamentHeroStyles.statusBadge,
                )}
              >
                {displayStatus.replaceAll("_", " ")}
              </Badge>
              <Badge className={cn(statusBadgeClass.muted, tournamentHeroStyles.statusBadge)}>
                {isPaidRegistration ? "Paid entry" : "Free"}
              </Badge>
              <Badge className={cn(statusBadgeClass.muted, tournamentHeroStyles.statusBadge)}>
                {formatLabel}
              </Badge>
            </div>

            <h1 className={tournamentHeroStyles.title}>{tournament.name}</h1>

            <p className="mt-3 text-sm font-medium text-foreground/85 drop-shadow-sm sm:mt-4">
              Hosted by {partnerName}
              {tournament.sportName ? ` · ${tournament.sportName}` : ""}
            </p>

            {tournament.summary ? (
              <div className={tournamentHeroStyles.summaryWrap}>
                <RichHtmlContent html={tournament.summary} variant="hero" />
              </div>
            ) : null}

            <div className={tournamentHeroStyles.metaRow}>
              {tournament.startsAt || tournament.venue ? (
                <div className={tournamentHeroStyles.metaFacts}>
                  {tournament.startsAt ? (
                    <span className={tournamentHeroStyles.metaItem}>
                      <Calendar className={tournamentHeroStyles.metaIcon} />
                      {formatDateRange(tournament.startsAt, tournament.endsAt)}
                    </span>
                  ) : null}
                  {tournament.venue ? (
                    <TournamentHeroVenueLink
                      venue={tournament.venue}
                      mapsUrl={venueMapsUrl}
                      className={tournamentHeroStyles.metaItem}
                      iconClassName={tournamentHeroStyles.metaIcon}
                    />
                  ) : null}
                </div>
              ) : null}
              {tournament.startsAt ? (
                <div className={tournamentHeroStyles.metaActions}>
                  <TournamentAddToCalendar
                    tone="hero"
                    event={{
                      title: tournament.name,
                      description: tournament.summary
                        ? stripHtmlToText(tournament.summary).slice(0, 500)
                        : null,
                      location: tournament.venue,
                      startsAt: tournament.startsAt,
                      endsAt: tournament.endsAt,
                      url: publicUrl,
                      uid: `${tournament.id}@${partnerSlug}`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {tournament.registrationClosesAt && registrationOpen ? (
            <div className="w-full shrink-0 lg:w-auto">
              <TournamentCountdown
                targetDate={tournament.registrationClosesAt}
                label="Registration closes in"
                tone="hero"
              />
            </div>
          ) : (
            <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
              <PartnerStatusBadge status={displayStatus} />
              {!registrationOpen ? (
                <Badge className={cn(statusBadgeClass.muted, tournamentHeroStyles.statusBadge)}>
                  Registration closed
                </Badge>
              ) : null}
            </div>
          )}
        </FadeInView>
      </TournamentHeroBanner>

      <TournamentLiveBanner
        matches={bannerMatches}
        variant="fun"
        onViewLive={() => navigateTab("Live Score")}
        viewLiveLabel="View live score"
      />

      <div className={partnerPageClass("space-y-5 py-6 sm:space-y-6 sm:py-8")}>
        <TournamentTabNav
          tabs={visibleTabs}
          active={tab}
          onChange={navigateTab}
          variant="official"
        />

        {tab === "Overview" ? (
          <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:gap-8">
            <div className="order-2 min-w-0 space-y-5 sm:space-y-6 lg:order-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <InfoCard
                  icon={CreditCard}
                  title="Entry"
                  value={feeLabel}
                  hint={
                    isPaidRegistration
                      ? "Guest team registration via partner checkout."
                      : "Free entry — organizer confirms after registration."
                  }
                />
                {prizeLabel ? (
                  <InfoCard
                    icon={Trophy}
                    title="Prize pool"
                    value={prizeLabel}
                    hint="Total prizes for this event."
                  />
                ) : null}
                <InfoCard
                  icon={Users}
                  title="Format"
                  value={formatLabel}
                  hint={
                    tournament.maxTeams
                      ? `Up to ${tournament.maxTeams} teams · ${tournament.playersPerTeam} players/team`
                      : `${tournament.playersPerTeam} players per team`
                  }
                />
                <InfoCard
                  icon={Radio}
                  title="Scoring"
                  value={scoringPrimary}
                  hint={scoringDetail}
                />
              </div>

              <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground">Who&apos;s playing</h2>
                    <p className="mt-1 text-sm text-cp-muted">
                      Confirmed teams only. Pending registrations are not shown until the organizer
                      confirms them.
                      {registeredPlayers > 0
                        ? ` ${registeredPlayers} confirmed players.`
                        : ""}
                      {spotsRemaining != null ? ` ${spotsRemaining} team spots left.` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-cp-primary">
                    {registeredTeams}
                    {maxTeams != null ? ` / ${maxTeams}` : ""} teams
                  </span>
                </div>
                {maxTeams != null ? (
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-cp-elevated">
                    <div
                      className="h-full rounded-full bg-cp-primary transition-all duration-500"
                      style={{ width: `${Math.round(capacityRatio * 100)}%` }}
                    />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full border-cp-border sm:w-auto"
                  onClick={() => navigateTab("Players")}
                >
                  View full player list
                </Button>
              </section>

              <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                <h2 className="font-semibold text-foreground">About</h2>
                <div className="mt-3 min-w-0 overflow-hidden">
                  {tournament.description ? (
                    <RichHtmlContent html={tournament.description} variant="article" />
                  ) : tournament.summary ? (
                    <RichHtmlContent html={tournament.summary} variant="article" />
                  ) : (
                    <p className="text-sm text-cp-muted">
                      {formatLabel} event
                      {tournament.venue ? ` at ${tournament.venue}` : ""}. Use the tabs for live
                      scores, players, standings, and bracket.
                    </p>
                  )}
                </div>
              </section>

              {tournament.venue ? (
                <section className="min-w-0 space-y-3">
                  <h2 className="font-semibold text-foreground">Location</h2>
                  <TournamentVenueMapPreview
                    venue={tournament.venue}
                    mapsUrl={venueMapsUrl}
                  />
                </section>
              ) : null}
            </div>

            <aside className="order-1 min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-cp-primary/30 bg-cp-card p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                  Entry
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {feeLabel}
                  {isPaidRegistration ? (
                    <span className="ml-1 text-sm font-medium text-cp-muted sm:text-base">
                      / team
                    </span>
                  ) : null}
                </p>
                {prizeLabel ? (
                  <p className="mt-2 text-sm text-cp-muted">
                    Prize pool{" "}
                    <span className="font-semibold text-foreground">{prizeLabel}</span>
                  </p>
                ) : null}

                {tournament.registrationClosesAt && registrationOpen ? (
                  <div className="mt-4">
                    <TournamentCountdown
                      targetDate={tournament.registrationClosesAt}
                      label="Closes in"
                      className="origin-left scale-90"
                    />
                  </div>
                ) : null}

                {spotsRemaining != null ? (
                  <p className="mt-2 text-xs text-cp-muted">
                    {spotsRemaining} spots remaining
                  </p>
                ) : null}

                <Badge
                  className={cn(
                    "mt-4 border-0",
                    registrationOpen
                      ? "bg-cp-primary/15 text-cp-primary"
                      : "bg-cp-elevated text-cp-muted",
                  )}
                >
                  {registrationOpen ? "Registration open" : "Registration closed"}
                </Badge>

                {registrationOpen ? (
                  <Button
                    asChild
                    className="mt-5 h-11 w-full bg-cp-primary text-base font-semibold hover:bg-cp-primary-light sm:mt-6 sm:h-12"
                  >
                    <Link href={registerHref}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register
                    </Link>
                  </Button>
                ) : null}
              </div>

              <TournamentShareCard url={publicUrl} tournamentName={tournament.name} />

              <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/50 px-4 py-3 text-xs leading-relaxed text-cp-muted">
                White-label event on {partnerName}. Results stay on this site and do not affect
                career rankings elsewhere.
              </div>
            </aside>
          </div>
        ) : (
          <div className="min-w-0 space-y-6">
            {tab === "Live Score" ? (
              caps.isAmericano ? (
                lobbyLoading && !lobbyData ? (
                  <LoadingSpinner label="Loading live scores…" />
                ) : (
                  <FunMatchPublicLiveScore
                    tournament={tournament}
                    liveData={liveData}
                    teams={lobbyTeams}
                  />
                )
              ) : (
                <PublicMultiCourtLiveScore
                  tournament={tournament}
                  liveData={liveData}
                  teams={officialTeams}
                  variant="fun_match"
                  mode={liveScoreMode}
                />
              )
            ) : null}

            {tab === "Players" ? (
              caps.isAmericano ? (
                lobbyLoading && !lobbyData ? (
                  <LoadingSpinner label="Loading players…" />
                ) : (
                  <FunMatchPublicPlayersTab
                    tournament={tournament}
                    liveData={liveData}
                    teams={lobbyTeams}
                  />
                )
              ) : bracketLoading && isElimination ? (
                <LoadingSpinner label="Loading players…" />
              ) : (
                <OfficialPublicPlayersTab
                  tournament={tournament}
                  bracketMatches={officialBracketMatches}
                  reclubMatches={officialReclubMatches}
                  teams={officialTeams}
                  participantsVariant="reclub"
                />
              )
            ) : null}

            {tab === "Groups" ? <DoubleStageGroupsTab tournament={tournament} /> : null}

            {tab === "Matches" ? (
              <DoubleStageMatchesTab tournament={tournament} partnerName={partnerName} />
            ) : null}

            {tab === "Bracket" ? (
              <OfficialPublicBracketTab
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                participant={participant}
                tournamentStatus={displayStatus}
                userTeamId={participant.userTeamId}
                manageHrefBase={manageHref}
              />
            ) : null}

            {tab === "History & stats" ? (
              bracketLoading && isElimination ? (
                <LoadingSpinner label="Loading history & stats…" />
              ) : (
                <OfficialPublicHistoryStatsTab
                  tournament={tournament}
                  bracketMatches={officialBracketMatches}
                  reclubMatches={
                    caps.isAmericano ? (lobbyData?.matches ?? []) : officialReclubMatches
                  }
                  teams={caps.isAmericano ? lobbyTeams : officialTeams}
                  sessionStats={sessionStats}
                  historyItems={historyItems}
                  participant={participant}
                  isElimination={isElimination}
                  userTeamId={participant.userTeamId}
                />
              )
            ) : null}
          </div>
        )}
      </div>
    </TournamentDetailPageShell>
    </div>
  );
}
