"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Monitor, Settings2 } from "lucide-react";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { FunMatchPublicLiveScore } from "@/components/tournaments/fun-match/fun-match-public-live-score";
import { FunMatchPublicPlayersTab } from "@/components/tournaments/fun-match/fun-match-public-players-tab";
import { DoubleStageGroupsTab } from "@/components/tournaments/official/double-stage-groups-tab";
import { DoubleStageMatchesTab } from "@/components/tournaments/official/double-stage-matches-tab";
import { OfficialPublicBracketTab } from "@/components/tournaments/official/official-public-bracket-tab";
import { OfficialPublicHistoryStatsTab } from "@/components/tournaments/official/official-public-history-stats-tab";
import { OfficialPublicPlayersTab } from "@/components/tournaments/official/official-public-players-tab";
import { PublicMultiCourtLiveScore } from "@/components/tournaments/public/public-multi-court-live-score";
import { TournamentLiveBanner } from "@/components/tournaments/public/tournament-live-banner";
import { TournamentTabNav } from "@/components/tournaments/tournament-detail-ui";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { useTournamentLobby } from "@/hooks/use-tournament-lobby";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import { partnerPublicRoutes } from "@/lib/constants/routes";
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
import { alertPanelClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

const TABS = [
  "Overview",
  "Live Score",
  "Players",
  "Standings",
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
};

export function PartnerTournamentPublicPage({
  partnerSlug,
  partnerName,
  tournament,
  participant,
  canManage,
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
      if (item === "Standings" && !caps.showGroupsTab) return false;
      if (item === "Matches" && !caps.isDoubleStage) return false;
      if (item === "Bracket") {
        if (!caps.showBracketTab) return false;
        if (caps.isDoubleStage && !isDoubleStageKnockout && !bracketHasTree) return false;
      }
      return true;
    });
  }, [caps, bracketHasTree, isDoubleStageKnockout]);

  const [tab, setTab] = useState<PartnerPublicTab>("Overview");

  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab("Overview");
  }, [tab, visibleTabs]);

  const displayStatus = liveData?.tournament.status ?? tournament.status;
  const formatLabel = getTournamentFormatLabel(tournament.format);
  const manageHref = partnerPublicRoutes.tournamentManage(partnerSlug, tournament.slug);
  const displayHref = partnerPublicRoutes.tournamentDisplay(partnerSlug, tournament.slug);
  const brandTheme = getTournamentDisplayConfig(tournament).brandTheme;
  const eventPrimary = brandTheme?.primaryColor;

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
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      style={
        eventPrimary
          ? ({
              ["--cp-primary" as string]: eventPrimary,
              ["--cp-primary-light" as string]: brandTheme?.accentColor ?? eventPrimary,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          "mb-6 overflow-hidden rounded-[1.5rem] border border-cp-border/80 bg-cp-card/70 p-5 shadow-sm sm:p-7",
        )}
        style={
          eventPrimary
            ? {
                background: `linear-gradient(125deg, ${eventPrimary}18 0%, transparent 50%, ${eventPrimary}0d 100%)`,
              }
            : undefined
        }
      >
        <PartnerPageHeader
          backHref={partnerPublicRoutes.tournaments(partnerSlug)}
          backLabel="Tournaments"
          title={tournament.name}
          description={
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <PartnerStatusBadge status={displayStatus} />
              <span>
                {formatLabel} · {tournament.sportName}
                {tournament.venue ? ` · ${tournament.venue}` : null}
              </span>
            </span>
          }
          actions={
            <>
              {canManage ? (
                <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
                  <Link href={manageHref}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="border-cp-border bg-cp-card/70">
                <Link href={displayHref}>
                  <Monitor className="mr-2 h-4 w-4" />
                  Display
                </Link>
              </Button>
            </>
          }
        />
      </div>

      <TournamentLiveBanner
        matches={bannerMatches}
        variant="fun"
        onViewLive={() => setTab("Live Score")}
        viewLiveLabel="View live score"
      />

      <div className="mt-6 border-b border-cp-border/80 pb-1">
        <TournamentTabNav tabs={visibleTabs} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6 space-y-6">
        {tab === "Overview" ? (
          <section className="space-y-4 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
            {tournament.summary ? (
              <p className="text-sm leading-relaxed text-foreground">{tournament.summary}</p>
            ) : (
              <p className="text-sm text-cp-muted">
                {formatLabel} event
                {tournament.venue ? ` at ${tournament.venue}` : ""}. Use the tabs for live scores,
                players, standings, order of play, and bracket.
              </p>
            )}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                  Format
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">{formatLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                  Status
                </dt>
                <dd className="mt-0.5 font-medium capitalize text-foreground">
                  {displayStatus.replaceAll("_", " ")}
                </dd>
              </div>
              {tournament.venue ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                    Venue
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">{tournament.venue}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

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

        {tab === "Standings" ? <DoubleStageGroupsTab tournament={tournament} /> : null}

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

      <p className={`mt-8 ${alertPanelClass.info}`}>
        This event does not affect Gud Game career points or player tiers.
      </p>
    </div>
  );
}
