"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, CreditCard, Loader2, MapPin, Radio, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { FadeInView } from "@/components/motion/fade-in";
import { OfficialPublicBracketTab } from "@/components/tournaments/official/official-public-bracket-tab";
import { OfficialPublicHistoryStatsTab } from "@/components/tournaments/official/official-public-history-stats-tab";
import { OfficialPublicPlayersTab } from "@/components/tournaments/official/official-public-players-tab";
import { OfficialAmericanoScoringPanel } from "@/components/tournaments/official-americano-scoring-panel";
import { PaymentReceiptActions } from "@/components/payments/payment-receipt-actions";
import { TournamentSessionChrome } from "@/components/tournaments/tournament-session-chrome";
import { tournamentTabUrl } from "@/lib/tournaments/manage-mode";
import { TournamentBreadcrumbs } from "@/components/tournaments/tournament-breadcrumbs";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { authRoutes, dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";
import { TournamentRoundHistorySection } from "@/components/tournaments/tournament-round-history-section";
import { TournamentRecentMatchesSection } from "@/components/tournaments/tournament-recent-matches-section";
import { OfficialRegistrationEditDialog } from "@/components/tournaments/official-registration-edit-dialog";
import { OfficialRegistrationManageActions } from "@/components/tournaments/official-registration-manage-actions";
import { TournamentCountdown } from "@/components/tournaments/tournament-countdown";
import { TournamentOrganizer } from "@/components/tournaments/tournament-organizer";
import { TournamentRulesAccordion } from "@/components/tournaments/tournament-rules-accordion";
import { TournamentShareCard } from "@/components/tournaments/tournament-share-card";
import {
  TournamentDetailPageShell,
  TournamentHeroBanner,
  TournamentTabNav,
  tournamentHeroStyles,
} from "@/components/tournaments/tournament-detail-ui";
import { VenueMapsPreview } from "@/components/tournaments/venue-maps-preview";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { Badge } from "@/components/ui/badge";
import { getOfficialBillingLabel } from "@/lib/tournaments/ui/labels";
import {
  getTournamentStatusBadgeClass,
  getTournamentTypeBadgeClass,
  tournamentHeroStatusBadgeBase,
} from "@/lib/styles/status-badges";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRegistrationStatus } from "@/hooks/use-registration-status";
import { useTournamentLobby } from "@/hooks/use-tournament-lobby";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import type { TournamentGearRuleItem } from "@/lib/tournaments/gear-for-rules";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { TournamentRuleSections } from "@/lib/tournaments/settings";
import {
  getTournamentCourtCount,
  getTournamentFormatLabel,
  getTournamentScoringDetailLabel,
  getTournamentScoringPrimaryLabel,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { mapBracketMatchesToRecentRows, mapReclubMatchesToRecentRows } from "@/lib/tournaments/recent-matches";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import { computeOfficialTournamentStats } from "@/lib/tournaments/stats/from-bracket";
import { computeReclubSessionStats } from "@/lib/tournaments/stats/from-reclub";
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
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";
import { getMaxRounds } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { hasPublicBracketTree } from "@/lib/tournaments/brackets/has-public-bracket";
import { isActiveRegistrationStatus } from "@/lib/tournaments/registration/urls";
import { formatPlayerNameList } from "@/lib/format/player-names";

function formatIdr(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateRange(starts: string | null, ends: string | null) {
  if (!starts) return "Date TBA";
  const start = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(starts));
  if (!ends) return start;
  const end = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(ends));
  return `${start} – ${end}`;
}

type OfficialTournamentPageProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  isAuthenticated: boolean;
  participant: TournamentParticipantContext;
  /** May open manage workspace (owner or invited staff). */
  canManage?: boolean;
  /** May edit tournament settings (owner only). */
  canEdit?: boolean;
  venueMapsUrl?: string | null;
  ruleSections?: TournamentRuleSections;
  gearItems?: TournamentGearRuleItem[];
};

const TABS = ["Overview", "Live Score", "Players", "Bracket", "History & stats"] as const;
type OfficialTab = (typeof TABS)[number];

export function OfficialTournamentPage({
  tournament,
  summary,
  isAuthenticated,
  participant,
  canManage = false,
  canEdit = false,
  venueMapsUrl = null,
  ruleSections,
  gearItems = [],
}: OfficialTournamentPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFreeOfficial = tournament.officialBilling === "free";
  const { data: liveData } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const livePhase =
    liveData?.phase ??
    (tournament.status === "live"
      ? "live"
      : tournament.status === "completed"
        ? "completed"
        : "not_started");

  const queryClient = useQueryClient();
  const tournamentPublicHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  const registeredToastHandled = useRef(false);
  const createdToastHandled = useRef(false);

  useEffect(() => {
    if (searchParams.get("created") !== "1") return;
    if (createdToastHandled.current) return;
    createdToastHandled.current = true;
    toast.success("Tournament created", {
      id: `tournament-created-${tournament.id}`,
      description: "Share the public page or open display mode for venue screens.",
    });
  }, [searchParams, tournament.id]);

  useEffect(() => {
    if (searchParams.get("registered") !== "1") return;
    if (registeredToastHandled.current) return;
    registeredToastHandled.current = true;

    void queryClient.invalidateQueries({
      queryKey: ["tournaments", "registration-status", tournament.sportSlug, tournament.slug],
    });
    invalidateTournamentQueries(queryClient, tournament.sportSlug, tournament.slug);
    router.replace(tournamentPublicHref, { scroll: false });
    router.refresh();
    toast.success("You're registered!", {
      id: `tournament-registered-${tournament.id}`,
      description: isFreeOfficial
        ? "Your team is confirmed for this event."
        : "Payment confirmed — your official receipt is ready in Payment history.",
    });
  }, [
    isFreeOfficial,
    queryClient,
    router,
    searchParams,
    tournament.id,
    tournament.slug,
    tournament.sportSlug,
    tournamentPublicHref,
  ]);

  const [tab, setTab] = useState<OfficialTab>("Overview");
  const registerHref = `${publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}/register`;
  const [publicUrl, setPublicUrl] = useState("");
  const [resumingPayment, setResumingPayment] = useState(false);
  const [editRegistrationOpen, setEditRegistrationOpen] = useState(false);
  const isElimination = tournament.format !== "americano";
  const visibleTabs = useMemo((): OfficialTab[] => {
    return TABS.filter((item) => isElimination || item !== "Bracket");
  }, [isElimination]);
  const matchTypeLabel = getTournamentFormatLabel(tournament.format);
  const scoringPrimaryLabel = getTournamentScoringPrimaryLabel(tournament);
  const scoringDetailLabel = getTournamentScoringDetailLabel(tournament);
  const courtCount = getTournamentCourtCount(tournament);
  useEffect(() => {
    setPublicUrl(window.location.href);
  }, []);
  useEffect(() => {
    if (!isElimination && tab === "Bracket") {
      setTab("Overview");
    }
  }, [isElimination, tab]);

  const navigateTab = useCallback(
    (next: OfficialTab) => {
      if (!isElimination && next === "Bracket") return;
      setTab(next);
      const url =
        next === "Overview"
          ? tournamentPublicHref
          : tournamentTabUrl(tournament.sportSlug, tournament.slug, next, false);
      router.replace(url, { scroll: false });
    },
    [isElimination, router, tournament.slug, tournament.sportSlug, tournamentPublicHref],
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const normalized =
      tabParam === "Stats" ? ("History & stats" as OfficialTab) : (tabParam as OfficialTab | null);
    const valid = new Set(visibleTabs);
    if (normalized && valid.has(normalized)) {
      setTab(normalized);
      return;
    }
    if (!tabParam) {
      setTab("Overview");
    }
  }, [searchParams, visibleTabs]);

  const handleManageClick = useCallback(() => {
    router.push(publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug));
  }, [router, tournament.sportSlug, tournament.slug]);

  const openManageRegistrations = useCallback(() => {
    router.push(
      `${publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug)}?section=registrations`,
    );
  }, [router, tournament.sportSlug, tournament.slug]);

  const { data: bracket, isLoading: bracketLoading } = useTournamentBracket(
    tournament.sportSlug,
    tournament.slug,
    { enabled: isElimination },
  );
  const bracketReady = hasPublicBracketTree(bracket);
  const { data: regStatus } = useRegistrationStatus(
    tournament.sportSlug,
    tournament.slug,
    isAuthenticated,
  );
  const regStatusRef = useRef(regStatus?.status);
  useEffect(() => {
    const prev = regStatusRef.current;
    const next = regStatus?.status;
    regStatusRef.current = next;
    if (
      prev &&
      (prev === "pending_payment" || prev === "awaiting_confirmation") &&
      next === "confirmed"
    ) {
      invalidateTournamentQueries(queryClient, tournament.sportSlug, tournament.slug);
      router.refresh();
    }
  }, [queryClient, regStatus?.status, router, tournament.slug, tournament.sportSlug]);

  const { data: americanoLobby } = useTournamentLobby(
    tournament.sportSlug,
    tournament.slug,
    !isElimination,
  );
  const { data: participantsData, isLoading: participantsLoading } = useTournamentParticipants(
    tournament.sportSlug,
    tournament.slug,
    1,
    200,
    {
      enabled:
        isElimination ||
        tab === "Players" ||
        tab === "History & stats" ||
        tab === "Live Score",
      refetchInterval: isElimination ? 8_000 : false,
    },
  );

  const sessionStats = useMemo(() => {
    if (!isElimination) {
      const lobbyMatches = americanoLobby?.matches ?? [];
      const lobbyTeams = americanoLobby?.teams ?? [];
      return computeReclubSessionStats({
        matches: lobbyMatches,
        teams: lobbyTeams,
        totalPlayers: summary.registeredPlayers,
        maxRounds: getMaxRounds(tournament),
      });
    }
    return computeOfficialTournamentStats({
      matches: bracket?.matches ?? [],
      leaderboard: bracket?.leaderboard ?? [],
      participants: participantsData?.items ?? [],
      totalPlayers: summary.registeredPlayers,
      totalTeams: summary.registeredTeams,
    });
  }, [
    americanoLobby?.matches,
    americanoLobby?.teams,
    bracket?.leaderboard,
    bracket?.matches,
    isElimination,
    participantsData?.items,
    summary.registeredPlayers,
    summary.registeredTeams,
    tournament,
  ]);

  const recentMatchRows = useMemo(() => {
    if (!isElimination) {
      return mapReclubMatchesToRecentRows(americanoLobby?.matches ?? [], tournament.status);
    }
    return mapBracketMatchesToRecentRows(bracket?.matches ?? [], tournament.status);
  }, [americanoLobby?.matches, bracket?.matches, isElimination, tournament.status]);

  const activeOfficialMatches = useMemo(() => {
    if (isElimination) {
      return (bracket?.matches ?? [])
        .filter(
          (match) =>
            isMatchLiveForTournament(match.status, tournament.status) &&
            match.teamAName &&
            match.teamBName,
        )
        .map((match) => ({
          id: match.id,
          teamAName: match.teamAName ?? "TBD",
          teamBName: match.teamBName ?? "TBD",
          teamAPlayers: match.teamAPlayers ?? [],
          teamBPlayers: match.teamBPlayers ?? [],
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          roundNumber: match.roundNumber,
          matchNumber: match.matchNumber,
        }));
    }
    const liveRounds =
      liveData?.matches?.filter(
        (m) =>
          isMatchLiveForTournament(m.status, tournament.status) &&
          m.teamAName &&
          m.teamBName,
      ) ?? [];
    if (liveRounds.length) {
      return liveRounds.map((liveRound) => ({
        id: liveRound.id,
        teamAName: liveRound.teamAName ?? "TBD",
        teamBName: liveRound.teamBName ?? "TBD",
        teamAPlayers: liveRound.teamAPlayers ?? [],
        teamBPlayers: liveRound.teamBPlayers ?? [],
        scoreA: liveRound.scoreA,
        scoreB: liveRound.scoreB,
        roundNumber: liveRound.roundNumber,
        matchNumber: "matchNumber" in liveRound ? liveRound.matchNumber : undefined,
      }));
    }
    const single = americanoLobby?.activeMatch;
    if (!single) return [];
    return [
      {
        id: single.id,
        teamAName: single.teamAName ?? "TBD",
        teamBName: single.teamBName ?? "TBD",
        teamAPlayers: single.teamAPlayers ?? [],
        teamBPlayers: single.teamBPlayers ?? [],
        scoreA: single.scoreA,
        scoreB: single.scoreB,
        roundNumber: single.roundNumber,
        matchNumber: undefined,
      },
    ];
  }, [americanoLobby?.activeMatch, bracket?.matches, isElimination, liveData?.matches, tournament.status]);

  const officialTeams = useMemo(() => {
    if (!isElimination) return americanoLobby?.teams ?? [];
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
    americanoLobby?.teams,
    bracket?.matches,
    isElimination,
    liveData?.players,
    participantsData?.items,
  ]);
  const officialReclubMatches = useMemo(() => {
    if (isElimination) return [];
    return americanoLobby?.matches ?? [];
  }, [americanoLobby?.matches, isElimination]);

  const officialBracketMatches = bracket?.matches ?? [];

  const historyItems = useMemo(() => {
    const fromLive = mapLiveHistoryToRoundItems(liveData?.matchHistory ?? []);
    const fromBracket = mapBracketMatchesToHistoryItems(bracket?.matches ?? []);
    const fromReclub = mapReclubMatchesToHistoryItems(americanoLobby?.matches ?? []);
    return mergeHistoryItems(fromLive, fromBracket, fromReclub);
  }, [americanoLobby?.matches, bracket?.matches, liveData?.matchHistory]);

  const liveScoreHistoryItems = useMemo(() => {
    if (historyItems.length > 0) return historyItems;
    return mergeHistoryItems(
      mapBracketMatchesToHistoryItems(bracket?.matches ?? []),
      mapReclubMatchesToHistoryItems(americanoLobby?.matches ?? []),
    );
  }, [americanoLobby?.matches, bracket?.matches, historyItems]);

  const activeOfficialMatch = activeOfficialMatches[0] ?? null;

  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push(
        `${authRoutes.register}?callbackUrl=${encodeURIComponent(tournamentPublicHref)}`,
      );
      return;
    }
    if (regStatus?.status === "awaiting_confirmation" && regStatus.confirmUrl) {
      router.push(regStatus.confirmUrl);
      return;
    }
    if (regStatus?.status === "pending_payment") {
      if (regStatus.checkoutUrl) {
        router.push(regStatus.checkoutUrl);
        return;
      }

      setResumingPayment(true);
      try {
        const res = await fetch(
          `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamName: regStatus.teamName?.trim() || "Team",
              memberUserIds: [],
            }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message ?? "Could not resume payment");
        }
        const checkoutUrl = json.data?.checkoutUrl as string | undefined;
        if (checkoutUrl) {
          router.push(checkoutUrl);
          return;
        }
        toast.error("Checkout is not available. Try again in a moment.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not resume payment");
      } finally {
        setResumingPayment(false);
      }
      return;
    }
    router.push(registerHref);
  };

  return (
    <TournamentDetailPageShell>
      {participant.canAccessManagePage ? (
        <TournamentSessionChrome
          sportSlug={tournament.sportSlug}
          slug={tournament.slug}
          tournamentId={tournament.id}
          name={tournament.name}
          phase={livePhase}
          canManage={canManage}
          canEdit={canEdit}
          editHref={canEdit ? tournamentEditUrl(tournament.id, "host") : undefined}
          listHref={dashboardRoutes.hostTournaments}
          onManageClick={handleManageClick}
          showCreateActions={isAuthenticated && participant.isOwner}
          canCreateOfficial={participant.isOwner}
        />
      ) : null}
      <TournamentHeroBanner coverImageUrl={tournament.coverImageUrl} variant="official">
        <TournamentBreadcrumbs
          sportSlug={tournament.sportSlug}
          sportName={tournament.sportName}
          tournamentName={tournament.name}
          className="mb-3"
        />

        <FadeInView className="mt-5 flex flex-col gap-6 sm:mt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {tournament.categoryLabel ? (
                <Badge variant="accent" className="border-0">
                  {tournament.categoryLabel}
                </Badge>
              ) : null}
              <Badge
                className={cn(
                  tournamentHeroStatusBadgeBase,
                  getTournamentStatusBadgeClass(tournament.status),
                )}
              >
                {tournament.status}
              </Badge>
              <Badge className={cn("border-0", getTournamentTypeBadgeClass("official"))}>
                {getOfficialBillingLabel(tournament.officialBilling)}
              </Badge>
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
              <div className={tournamentHeroStyles.summaryWrap}>
                <RichHtmlContent html={tournament.summary} variant="hero" />
              </div>
            ) : null}
            <div className={tournamentHeroStyles.metaRow}>
              <span className={tournamentHeroStyles.metaItem}>
                <Calendar className="h-4 w-4 shrink-0 text-cp-primary" />
                {formatDateRange(tournament.startsAt, tournament.endsAt)}
              </span>
              {tournament.venue ? (
                <span className={tournamentHeroStyles.metaItem}>
                  <MapPin className="h-4 w-4 shrink-0 text-cp-primary" />
                  <span className="break-words">{tournament.venue}</span>
                </span>
              ) : null}
            </div>
          </div>
          {summary.registrationClosesAt ? (
            <div className="w-full shrink-0 lg:w-auto">
              <TournamentCountdown
                targetDate={summary.registrationClosesAt}
                label="Registration closes in"
                tone="hero"
              />
            </div>
          ) : null}
        </FadeInView>
      </TournamentHeroBanner>

      {activeOfficialMatch ? (
        <section className="border-b border-cp-primary/30 bg-linear-to-r from-cp-primary/12 via-cp-card to-cp-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-primary">
                <Radio className="h-4 w-4 animate-pulse" />
                Official live score
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Round {activeOfficialMatch.roundNumber} · Match{" "}
                {activeOfficialMatch.matchNumber}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-cp-muted">
                Live now
              </p>
            </div>
            <Button
              variant="outline"
              className="border-cp-primary/30 bg-cp-card/70"
              onClick={() => navigateTab(isElimination ? "Bracket" : "Live Score")}
            >
              {isElimination ? "View bracket" : "View live score"}
            </Button>
          </div>
        </section>
      ) : null}

      <div
        className={cn(
          "mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8",
          tab === "Overview"
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]"
            : "max-w-6xl lg:grid-cols-1",
        )}
      >
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <TournamentTabNav<OfficialTab>
            tabs={visibleTabs}
            active={tab}
            onChange={navigateTab}
            variant="official"
          />

          {tab === "Overview" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={Trophy}
                  title="Prize pool"
                  value={formatIdr(tournament.prizePoolIdr)}
                  hint="Distributed among top placements."
                />
                <InfoCard
                  icon={Users}
                  title="Format"
                  value={matchTypeLabel}
                  hint={
                    tournament.maxTeams
                      ? `Up to ${tournament.maxTeams} teams · ${tournament.playersPerTeam} players/team`
                      : `${tournament.playersPerTeam} players per team`
                  }
                />
                <InfoCard
                  icon={Radio}
                  title="Scoring"
                  value={scoringPrimaryLabel}
                  hint={scoringDetailLabel}
                />
              </div>
              <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-foreground">Who&apos;s playing</h2>
                    <p className="mt-1 text-sm text-cp-muted">
                      {summary.registeredPlayers} players registered
                      {summary.spotsRemaining != null
                        ? ` · ${summary.spotsRemaining} team spots left`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-cp-primary">
                    {summary.registeredTeams}
                    {summary.maxTeams != null ? ` / ${summary.maxTeams}` : ""} teams
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-cp-elevated">
                  <div
                    className="h-full rounded-full bg-cp-primary transition-all duration-500"
                    style={{
                      width: `${summary.maxTeams ? Math.min(100, (summary.registeredTeams / summary.maxTeams) * 100) : 40}%`,
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-cp-border"
                  onClick={() => navigateTab("Players")}
                >
                  View full player list
                </Button>
              </section>
              <TournamentRecentMatchesSection
                variant="official"
                rows={recentMatchRows}
                alwaysShow
                emptyMessage={
                  !isElimination
                    ? "Americano results will appear after rounds are recorded."
                    : bracketReady
                    ? "No match results yet. Seeded bracket matches will appear here as play progresses."
                    : "The host will publish the bracket after registration closes. Results will show here once matches are played."
                }
                onViewAll={isElimination ? () => navigateTab("Bracket") : () => navigateTab("Live Score")}
              />
              {tournament.description ? (
                <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                  <h2 className="font-semibold text-foreground">About</h2>
                  <div className="mt-3 text-sm leading-relaxed text-cp-muted">
                    <RichHtmlContent html={tournament.description} variant="article" />
                  </div>
                </section>
              ) : null}
              {tournament.venue ? (
                <VenueMapsPreview
                  venue={tournament.venue}
                  mapsUrl={venueMapsUrl}
                />
              ) : null}
              <TournamentRulesAccordion
                matchFormatHtml={ruleSections?.matchFormatHtml}
                equipmentStandardsHtml={ruleSections?.equipmentStandardsHtml}
                format={tournament.format}
                sportSlug={tournament.sportSlug}
                gearItems={gearItems}
              />
            </>
          ) : null}

          {tab === "Live Score" ? (
            !isElimination ? (
              <OfficialAmericanoScoringPanel
                tournament={tournament}
                participant={participant}
                livePhase={livePhase}
                variant="live"
              />
            ) : (
            <div className="space-y-6">
              {activeOfficialMatches.length > 0 ? (
                <section className="rounded-2xl border border-cp-primary/25 bg-cp-card p-4 sm:p-6">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-primary">
                    <Radio className="h-4 w-4 animate-pulse" />
                    {activeOfficialMatches.length} court{activeOfficialMatches.length === 1 ? "" : "s"} live
                  </p>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {activeOfficialMatches.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-xl border border-cp-primary/20 bg-cp-elevated/20 p-4"
                      >
                        <p className="text-xs text-cp-muted">
                          Round {m.roundNumber}
                          {m.matchNumber ? ` · Match ${m.matchNumber}` : ""}
                        </p>
                        <p className="mt-1 font-semibold text-foreground">
                          {m.teamAName} vs {m.teamBName}
                        </p>
                        {m.teamAPlayers?.length || m.teamBPlayers?.length ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-cp-muted">
                            {[formatPlayerNameList(m.teamAPlayers), formatPlayerNameList(m.teamBPlayers)]
                              .filter(Boolean)
                              .join(" vs ")}
                          </p>
                        ) : null}
                        <p className="mt-3 text-center text-3xl font-bold tabular-nums">
                          {m.scoreA ?? 0} : {m.scoreB ?? 0}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {isElimination ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-cp-primary/30"
                      onClick={() => navigateTab("Bracket")}
                    >
                      View bracket
                    </Button>
                  ) : null}
                </section>
              ) : (
                <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 p-6 text-center sm:p-10">
                  <Radio className="mx-auto h-8 w-8 text-cp-primary/80" />
                  <h2 className="mt-3 text-lg font-semibold text-foreground">No live match right now</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-cp-muted">
                    {liveData?.message ??
                      (bracketReady
                        ? "Official scores appear here when a bracket match is in progress."
                        : "The host will publish the bracket after registration closes. Live scores follow once play starts.")}
                  </p>
                </section>
              )}

              {liveScoreHistoryItems.length > 0 ? (
                <TournamentRoundHistorySection
                  variant="official"
                  items={liveScoreHistoryItems}
                />
              ) : null}
            </div>
            )
          ) : null}

          {tab === "Players" ? (
            bracketLoading && isElimination ? (
              <LoadingSpinner label="Loading players…" />
            ) : (
              <OfficialPublicPlayersTab
                tournament={tournament}
                bracketMatches={officialBracketMatches}
                reclubMatches={officialReclubMatches}
                teams={officialTeams}
              />
            )
          ) : null}

          {tab === "Bracket" ? (
            <OfficialPublicBracketTab
              sportSlug={tournament.sportSlug}
              slug={tournament.slug}
              participant={participant}
              tournamentStatus={tournament.status}
              userTeamId={regStatus?.teamId ?? null}
            />
          ) : null}

          {tab === "History & stats" ? (
            bracketLoading || participantsLoading ? (
              <LoadingSpinner label="Loading history & stats…" />
            ) : (
              <OfficialPublicHistoryStatsTab
                tournament={tournament}
                bracketMatches={officialBracketMatches}
                reclubMatches={officialReclubMatches}
                teams={officialTeams}
                sessionStats={sessionStats}
                historyItems={historyItems}
                participant={participant}
                isElimination={isElimination}
                userTeamId={regStatus?.teamId ?? null}
              />
            )
          ) : null}
        </div>

        {tab === "Overview" ? (
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-cp-primary/30 bg-cp-card p-4 shadow-[0_8px_32px_rgba(0,71,255,0.12)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
              {isFreeOfficial ? "Entry" : "Registration fee"}
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {isFreeOfficial ? "Free" : formatIdr(tournament.registrationFeeIdr)}
              {!isFreeOfficial ? (
                <span className="ml-1 text-base font-medium text-cp-muted">/ team</span>
              ) : null}
            </p>

            {summary.registrationClosesAt ? (
              <div className="mt-4">
                <TournamentCountdown
                  targetDate={summary.registrationClosesAt}
                  label="Closes in"
                  className="scale-90 origin-left"
                />
              </div>
            ) : null}

            {summary.spotsRemaining != null ? (
              <p className="mt-2 text-xs text-cp-muted">{summary.spotsRemaining} spots remaining</p>
            ) : null}

            {regStatus?.status === "confirmed" ? (
              <Badge variant="success" className="mt-4 border-0">
                You&apos;re registered
                {regStatus.teamName ? ` · ${regStatus.teamName}` : ""}
              </Badge>
            ) : regStatus?.status === "awaiting_confirmation" ? (
              <Badge variant="accent" className="mt-4 border-0">
                Confirm participation
              </Badge>
            ) : regStatus?.status === "pending_payment" ? (
              <Badge variant="warning" className="mt-4 border-0">
                Payment pending
              </Badge>
            ) : null}

            {regStatus?.status !== "confirmed" ? (
              <Button
                className="btn-interactive mt-6 h-12 w-full bg-cp-primary text-base font-semibold hover:bg-cp-primary-light"
                disabled={
                  resumingPayment ||
                  (!summary.registrationOpen &&
                    regStatus?.status !== "pending_payment" &&
                    regStatus?.status !== "awaiting_confirmation")
                }
                onClick={() => void handleRegister()}
              >
                {resumingPayment ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {!isAuthenticated
                  ? "Sign up to register"
                  : resumingPayment
                    ? "Opening checkout…"
                    : regStatus?.status === "awaiting_confirmation"
                      ? "Confirm participation"
                      : regStatus?.status === "pending_payment"
                        ? "Continue to checkout"
                        : "Register team"}
              </Button>
            ) : null}

            {!isFreeOfficial && regStatus?.status === "confirmed" && regStatus.paymentId ? (
              <div className="mt-4 border-t border-cp-border/60 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cp-primary">
                  Payment receipt
                </p>
                <PaymentReceiptActions paymentId={regStatus.paymentId} layout="stack" />
              </div>
            ) : null}

            {isAuthenticated &&
            regStatus?.registrationId &&
            regStatus.status &&
            isActiveRegistrationStatus(regStatus.status) ? (
              <OfficialRegistrationManageActions
                registrationId={regStatus.registrationId}
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                teamName={regStatus.teamName}
                registrationStatus={regStatus.status}
                layout="stacked"
                onEditTeam={() => setEditRegistrationOpen(true)}
                onCancelled={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["tournaments", "registration-status", tournament.sportSlug, tournament.slug],
                  });
                }}
                redirectOnCancel={publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}
              />
            ) : null}

            {participant.isOwner ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full border-cp-border"
                onClick={openManageRegistrations}
              >
                Manage registrations
              </Button>
            ) : null}
          </div>

          {editRegistrationOpen && regStatus?.registrationId ? (
            <OfficialRegistrationEditDialog
              open={editRegistrationOpen}
              onOpenChange={setEditRegistrationOpen}
              registrationId={regStatus.registrationId}
              sportSlug={tournament.sportSlug}
              tournamentSlug={tournament.slug}
              tournamentName={tournament.name}
              onSaved={() => {
                void queryClient.invalidateQueries({
                  queryKey: ["tournaments", "registration-status", tournament.sportSlug, tournament.slug],
                });
              }}
            />
          ) : null}

          <TournamentShareCard url={publicUrl} tournamentName={tournament.name} />

        </aside>
        ) : null}
      </div>
    </TournamentDetailPageShell>
  );
}

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
    <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-cp-primary">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className={cn("mt-3 text-xl font-bold text-foreground capitalize")}>{value}</p>
      <p className="mt-1 text-xs text-cp-muted">{hint}</p>
    </div>
  );
}
