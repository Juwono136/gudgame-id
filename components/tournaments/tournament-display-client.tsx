"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DisplayIdleScoreboard } from "@/components/tournaments/display/display-idle-scoreboard";
import { DisplayBracketSlide } from "@/components/tournaments/display/display-bracket-slide";
import { DisplayGroupStageSlide } from "@/components/tournaments/display/display-group-stage-slide";
import { DisplaySessionLeaderboard } from "@/components/tournaments/display/display-session-leaderboard";
import { DisplaySponsorStrip } from "@/components/tournaments/display/display-sponsor-strip";
import { DisplayVenueButton } from "@/components/tournaments/display/display-venue-button";
import { DisplayVenueControls } from "@/components/tournaments/display/display-venue-controls";
import { LiveGameRaceDisplay } from "@/components/tournaments/game-race-scoreboard";
import { LiveScoreboardDisplay } from "@/components/tournaments/live-scoreboard";
import {
  MULTI_COURT_PER_SLIDE,
  MULTI_COURT_SLIDE_INTERVAL_MS,
  MultiCourtDisplayCard,
  MultiCourtDisplayGrid,
} from "@/components/tournaments/display-multi-court-grid";
import { DisplayVenueShell } from "@/components/tournaments/display-venue-shell";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { publicSportRoutes } from "@/lib/constants/routes";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import type { MatchGameState } from "@/lib/tournaments/scoring/game-mode";
import type { TournamentDisplayLayout } from "@/lib/tournaments/settings";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { resolveGamesDisplayMode } from "@/lib/tournaments/live/display-scoring";

type TournamentDisplayClientProps = {
  sportSlug: string;
  slug: string;
  backHref?: string;
  /** Partner white-label logo for TV hospitality branding. */
  partnerLogoUrl?: string | null;
  partnerName?: string | null;
};

type LiveMatchView = {
  id: string;
  type?: string;
  roundNumber?: number;
  matchNumber?: number;
  teamAName?: string | null;
  teamBName?: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA?: number | null;
  scoreB?: number | null;
  status?: string;
  courtId?: string | null;
  startedAt?: string | null;
  timerEndsAt?: string | null;
  gameState?: MatchGameState | null;
  scorekeeperName?: string | null;
};

const ROTATION_LAYOUTS: TournamentDisplayLayout[] = [
  "multi_court",
  "single",
  "group_stage",
  "leaderboard",
  "bracket",
];

function pickActiveMatch(
  matches: LiveMatchView[],
  matchId: string | null,
  tournamentStatus?: string | null,
): LiveMatchView | null {
  if (!matches.length) return null;

  if (matchId) {
    const targeted = matches.find((m) => String(m.id) === matchId);
    if (targeted?.teamAName && targeted?.teamBName) return targeted;
  }

  const inProgress = matches.find(
    (m) =>
      isMatchLiveForTournament(m.status ?? "pending", tournamentStatus) &&
      m.teamAName &&
      m.teamBName,
  );
  if (inProgress) return inProgress;

  return (
    matches.find((m) => m.teamAName && m.teamBName && m.status !== "bye") ?? null
  );
}

function buildSubtitle(
  tournamentName: string,
  match: LiveMatchView,
  isOfficial: boolean,
  courtLabel?: string,
  isPartnerEvent = false,
) {
  const courtPrefix = courtLabel ? `${courtLabel} · ` : "";
  if (match.type === "bracket") {
    const round = match.roundNumber != null ? `Round ${match.roundNumber}` : "Bracket";
    const matchNo =
      match.matchNumber != null ? ` · Match ${match.matchNumber}` : "";
    return `${courtPrefix}${tournamentName} · ${round}${matchNo}`;
  }

  if (match.type === "lobby_round" || match.type === "americano_round") {
    return `${courtPrefix}${tournamentName} · Live Round ${match.roundNumber ?? ""}`.trim();
  }

  if (isPartnerEvent) {
    return `${courtPrefix}${tournamentName} · Live`;
  }

  return isOfficial
    ? `${courtPrefix}${tournamentName} · Official live`
    : `${courtPrefix}${tournamentName} · Fun Match live`;
}

function resolveMatchForCourt(
  courtId: string,
  courts: Array<{ id: string; name: string; courtNumber: number; activeMatchId: string | null }>,
  matches: LiveMatchView[],
  tournamentStatus?: string | null,
): LiveMatchView | null {
  const court = courts.find((c) => c.id === courtId);
  if (court?.activeMatchId) {
    const fromActive = matches.find((m) => String(m.id) === court.activeMatchId);
    if (fromActive?.teamAName && fromActive?.teamBName) return fromActive;
  }
  const onCourt = matches.find(
    (m) =>
      m.courtId === courtId &&
      m.teamAName &&
      m.teamBName &&
      isMatchLiveForTournament(m.status ?? "pending", tournamentStatus),
  );
  if (onCourt) return onCourt;
  return (
    matches.find((m) => m.courtId === courtId && m.teamAName && m.teamBName) ?? null
  );
}

export function TournamentDisplayClient({
  sportSlug,
  slug,
  backHref,
  partnerLogoUrl = null,
  partnerName = null,
}: TournamentDisplayClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const courtIdParam = searchParams.get("courtId");
  const layoutParam = searchParams.get("layout") as TournamentDisplayLayout | null;
  const isPinned = Boolean(matchId || courtIdParam);
  const { data, isLoading, isError, refetch, isFetching } = useTournamentLive(
    sportSlug,
    slug,
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [multiCourtSlide, setMultiCourtSlide] = useState(0);

  const layout: TournamentDisplayLayout = useMemo(() => {
    if (courtIdParam) return layoutParam ?? "single";
    const cfg = data?.displayConfig;
    if (cfg?.autoRotate || cfg?.layout === "rotation") return "rotation";
    if (layoutParam) return layoutParam;
    return (cfg?.layout as TournamentDisplayLayout | undefined) ?? (isOfficialType(data?.tournament.tournamentType ?? "") ? "single" : "multi_court");
  }, [courtIdParam, data?.displayConfig, data?.tournament.tournamentType, layoutParam]);

  const rotationLayouts = useMemo((): TournamentDisplayLayout[] => {
    const fromCfg = data?.displayConfig?.rotationLayouts;
    if (fromCfg?.length) {
      return fromCfg.filter((l): l is TournamentDisplayLayout =>
        ROTATION_LAYOUTS.includes(l as TournamentDisplayLayout),
      );
    }
    return ROTATION_LAYOUTS;
  }, [data?.displayConfig?.rotationLayouts]);

  const effectiveLayout = useMemo(() => {
    if (layout !== "rotation") return layout;
    return rotationLayouts[rotationIndex % rotationLayouts.length] ?? "single";
  }, [layout, rotationIndex, rotationLayouts]);

  useEffect(() => {
    if (layout !== "rotation") return;
    const intervalSec = data?.displayConfig?.rotationIntervalSec ?? 15;
    const id = setInterval(() => {
      setRotationIndex((i) => i + 1);
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [data?.displayConfig?.rotationIntervalSec, layout, rotationLayouts.length]);

  useEffect(() => {
    setRotationIndex(0);
  }, [
    data?.displayConfig?.layout,
    data?.displayConfig?.autoRotate,
    data?.displayConfig?.rotationIntervalSec,
    data?.displayConfig?.rotationLayouts?.join(","),
  ]);

  const enterFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* browser may block without user gesture */
    }
  };

  const tournamentUrl = publicSportRoutes.tournament(sportSlug, slug);
  const exitHref = backHref ?? tournamentUrl;
  const exitDisplay = useCallback(() => router.push(exitHref), [router, exitHref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitDisplay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitDisplay]);

  const activeMatches = useMemo(
    () =>
      (data?.matches ?? []).filter(
        (m) =>
          isMatchLiveForTournament(m.status, data?.tournament.status) &&
          m.teamAName &&
          m.teamBName,
      ) as LiveMatchView[],
    [data?.matches, data?.tournament.status],
  );

  const sortedCourts = useMemo(
    () =>
      [...(data?.courts ?? [])].sort(
        (a, b) => (a.sortOrder ?? a.courtNumber) - (b.sortOrder ?? b.courtNumber),
      ),
    [data?.courts],
  );

  /** Only live courts — idle “Waiting” never shown on venue TV. */
  const liveCourtsOrdered = useMemo(() => {
    if (!sortedCourts.length) return [];
    const liveCourtIds = new Set(
      activeMatches.map((m) => m.courtId).filter((id): id is string => Boolean(id)),
    );
    return sortedCourts.filter((c) => liveCourtIds.has(c.id));
  }, [sortedCourts, activeMatches]);

  const multiCourtItemCount =
    liveCourtsOrdered.length > 0 ? liveCourtsOrdered.length : activeMatches.length;
  const multiCourtSlideCount = Math.max(
    1,
    Math.ceil(Math.max(multiCourtItemCount, 1) / MULTI_COURT_PER_SLIDE),
  );

  useEffect(() => {
    if (effectiveLayout !== "multi_court" || multiCourtSlideCount <= 1) return;
    const id = setInterval(() => {
      setMultiCourtSlide((i) => (i + 1) % multiCourtSlideCount);
    }, MULTI_COURT_SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [effectiveLayout, multiCourtSlideCount]);

  useEffect(() => {
    setMultiCourtSlide(0);
  }, [
    effectiveLayout,
    liveCourtsOrdered.map((c) => c.id).join(","),
    activeMatches.map((m) => m.id).join(","),
  ]);

  useEffect(() => {
    setMultiCourtSlide((i) => Math.min(i, Math.max(0, multiCourtSlideCount - 1)));
  }, [multiCourtSlideCount]);

  const activeMatch = useMemo(() => {
    if (courtIdParam && data?.courts) {
      return resolveMatchForCourt(
        courtIdParam,
        data.courts,
        (data.matches ?? []) as LiveMatchView[],
        data.tournament.status,
      );
    }
    return pickActiveMatch(data?.matches ?? [], matchId, data?.tournament.status);
  }, [courtIdParam, data?.courts, data?.matches, data?.tournament.status, matchId]);

  const pinnedCourtLabel = useMemo(() => {
    if (!courtIdParam || !data?.courts) return undefined;
    return resolveCourtLabel(courtIdParam, data.courts);
  }, [courtIdParam, data?.courts]);

  const featuredMatch = useMemo(() => {
    if (courtIdParam && activeMatch) return activeMatch;
    if (activeMatches.length > 1) {
      return activeMatches[featuredIndex % activeMatches.length] ?? activeMatch;
    }
    return activeMatch;
  }, [activeMatch, activeMatches, courtIdParam, featuredIndex]);

  useEffect(() => {
    if (effectiveLayout !== "single" || activeMatches.length <= 1 || isPinned) return;
    const id = setInterval(() => {
      setFeaturedIndex((i) => i + 1);
    }, 10_000);
    return () => clearInterval(id);
  }, [activeMatches.length, effectiveLayout, isPinned]);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [activeMatches.map((m) => m.id).join(",")]);

  const isOfficial = isOfficialType(data?.tournament.tournamentType);
  const isPartnerEvent = Boolean(partnerName || partnerLogoUrl);

  const displayControls = (
    <DisplayVenueControls
      onRefresh={() => void refetch()}
      onFullscreen={() => void enterFullscreen()}
      onExit={exitDisplay}
      refreshing={isFetching}
    />
  );

  if (isLoading) {
    return (
      <DisplayVenueShell className="flex min-h-dvh items-center justify-center text-white/70">
        <Loader2 className="h-8 w-8 animate-spin" />
      </DisplayVenueShell>
    );
  }

  if (isError || !data) {
    return (
      <DisplayVenueShell className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-white">
        <p className="text-sm text-white/70">Could not load scoreboard.</p>
        <DisplayVenueButton type="button" variant="outline" onClick={() => void refetch()}>
          Retry
        </DisplayVenueButton>
        <DisplayVenueButton asChild variant="ghost">
          <Link href={exitHref}>Back to tournament</Link>
        </DisplayVenueButton>
      </DisplayVenueShell>
    );
  }

  const brandTheme = data.displayConfig?.brandTheme ?? null;
  const sponsorBanners = data.displayConfig?.sponsorBanners ?? [];
  const sponsorStrip =
    sponsorBanners.length > 0 ? <DisplaySponsorStrip banners={sponsorBanners} /> : null;
  const showLogo = brandTheme?.showPartnerLogo !== false && Boolean(partnerLogoUrl);
  const brandBadge =
    showLogo || partnerName ? (
      <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partnerLogoUrl!}
            alt=""
            className="h-10 w-10 rounded-xl object-cover shadow-lg ring-2 ring-white/20 sm:h-12 sm:w-12"
          />
        ) : null}
        {partnerName ? (
          <span className="hidden rounded-lg bg-black/35 px-2.5 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm sm:inline">
            {partnerName}
          </span>
        ) : null}
      </div>
    ) : null;

  const slideKey = `${effectiveLayout}-${rotationIndex}`;

  const wrapStage = (main: ReactNode) => (
    <DisplayVenueShell ref={shellRef} lockViewport brandTheme={brandTheme}>
      {brandBadge}
      {sponsorStrip}
      <div className="relative min-h-0 flex-1 overflow-hidden">{main}</div>
      {displayControls}
    </DisplayVenueShell>
  );

  const shellContent = (() => {
    switch (effectiveLayout) {
      case "multi_court": {
        const matchByCourtId = new Map(
          activeMatches
            .filter((m) => m.courtId)
            .map((m) => [m.courtId as string, m]),
        );
        const slide = multiCourtSlide % multiCourtSlideCount;
        const pageStart = slide * MULTI_COURT_PER_SLIDE;

        const liveCards: Array<{
          key: string;
          courtName: string;
          match: LiveMatchView;
        }> = [];

        if (liveCourtsOrdered.length > 0) {
          for (const court of liveCourtsOrdered.slice(
            pageStart,
            pageStart + MULTI_COURT_PER_SLIDE,
          )) {
            const m = matchByCourtId.get(court.id);
            if (m?.teamAName && m.teamBName) {
              liveCards.push({ key: court.id, courtName: court.name, match: m });
            }
          }
        } else {
          for (const m of activeMatches.slice(pageStart, pageStart + MULTI_COURT_PER_SLIDE)) {
            const court = sortedCourts.find((c) => c.id === m.courtId);
            const courtLabel =
              court?.name ??
              (m.type === "bracket"
                ? `Bracket · R${m.roundNumber ?? "?"}${m.matchNumber != null ? ` M${m.matchNumber}` : ""}`
                : "Court");
            liveCards.push({ key: m.id, courtName: courtLabel, match: m });
          }
        }

        return (
          <div
            className="animate-in fade-in h-full min-h-0 overflow-hidden duration-500"
            key={`${slideKey}-mc-${slide}`}
          >
            {liveCards.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={liveCards.length}
                liveCount={activeMatches.length}
                slideIndex={slide}
                slideCount={multiCourtSlideCount}
              >
                {liveCards.map(({ key, courtName, match: m }) => {
                  const gamesMode = resolveGamesDisplayMode(data.scoring, m);
                  return (
                    <MultiCourtDisplayCard
                      key={key}
                      courtName={courtName}
                      teamAName={m.teamAName!}
                      teamBName={m.teamBName!}
                      teamAPlayers={m.teamAPlayers}
                      teamBPlayers={m.teamBPlayers}
                      scoreA={m.scoreA ?? 0}
                      scoreB={m.scoreB ?? 0}
                      startedAt={m.startedAt}
                      timerEndsAt={m.timerEndsAt}
                      estimatedDurationMinutes={
                        data.scoring?.roundDurationMinutes ?? null
                      }
                      matchActive={isMatchLiveForTournament(
                        m.status ?? "pending",
                        data.tournament.status,
                      )}
                      scorekeeperName={m.scorekeeperName}
                      gamesMode={gamesMode}
                    />
                  );
                })}
              </MultiCourtDisplayGrid>
            ) : (
              <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
                No live matches right now — start a court from Live scoring.
              </p>
            )}
          </div>
        );
      }

      case "leaderboard": {
        const teamRows = [...(data.playerStats?.teams ?? [])].sort(
          (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor,
        );
        const playerRows = [...(data.playerStats?.players ?? [])].sort(
          (a, b) => b.teamPointsFor - a.teamPointsFor || b.teamWins - a.teamWins,
        );
        const playersByTeam = new Map<string, string[]>();
        const groupByTeamId = new Map<string, string>();
        for (const squad of data.players ?? []) {
          playersByTeam.set(
            squad.teamId,
            squad.members.map((m) => m.name?.trim() || "Player").filter(Boolean),
          );
        }
        for (const group of data.doubleStage?.groups ?? []) {
          const g = group as {
            name?: string;
            standings?: Array<{ teamId?: string | null }>;
          };
          for (const standing of g.standings ?? []) {
            if (standing.teamId && g.name) {
              groupByTeamId.set(standing.teamId, g.name);
            }
          }
        }
        const showGroupColumn = groupByTeamId.size > 0;
        const leaderboardRows =
          teamRows.length > 0
            ? teamRows.map((t) => ({
                id: t.teamId ?? t.name,
                name: t.name,
                subtitle: (t.teamId ? playersByTeam.get(t.teamId) : undefined)?.join(", "),
                groupName: t.teamId ? groupByTeamId.get(t.teamId) : null,
                wins: t.wins,
                losses: t.losses,
                ties: t.draws,
                games: t.played,
                winRate: t.winRate,
                diff: t.pointsFor - t.pointsAgainst,
                points: t.pointsFor,
              }))
            : playerRows.map((p) => ({
                id: p.userId,
                name: p.displayName,
                subtitle: p.teamName,
                groupName: null,
                wins: p.teamWins,
                losses: p.teamLosses,
                ties: 0,
                games: p.teamPlayed,
                winRate:
                  p.teamPlayed > 0
                    ? Math.round((p.teamWins / p.teamPlayed) * 100)
                    : 0,
                diff: p.teamPointsFor - p.teamPointsAgainst,
                points: p.teamPointsFor,
              }));

        return (
          <div className="relative h-full min-h-0" key={slideKey}>
            <DisplaySessionLeaderboard
              tournamentName={data.tournament.name}
              title="Session leaderboard"
              entityLabel={teamRows.length > 0 ? "Team" : "Player"}
              rows={leaderboardRows}
              showGroupColumn={showGroupColumn}
            />
          </div>
        );
      }

      case "group_stage":
        return (
          <div
            className="animate-in fade-in h-full min-h-0 overflow-hidden duration-500"
            key={slideKey}
          >
            <DisplayGroupStageSlide
              tournamentName={data.tournament.name}
              liveData={{
                matches: data.matches,
                courts: data.courts,
                scoring: data.scoring,
                tournament: data.tournament,
              }}
            />
          </div>
        );

      case "bracket": {
        const bracketMatches = (data.bracket?.matches ?? []) as BracketMatchView[];
        return (
          <div
            className="animate-in fade-in h-full min-h-0 overflow-hidden duration-500"
            key={slideKey}
          >
            <DisplayBracketSlide
              tournamentName={data.tournament.name}
              matches={bracketMatches}
              tournamentStatus={data.tournament.status}
            />
          </div>
        );
      }

      case "single":
      default:
        break;
    }
    return null;
  })();

  if (shellContent) {
    return wrapStage(shellContent);
  }

  if (!featuredMatch?.teamAName || !featuredMatch?.teamBName) {
    return wrapStage(
      <div className="relative h-full min-h-0 w-full">
        <DisplayIdleScoreboard
          tournamentName={data.tournament.name}
          message={
            data.phase === "live"
              ? "No active match on the scoreboard yet. Start a lobby round or bracket match — this screen updates automatically."
              : (data.message ??
                "No live match to display yet. Check back when the tournament is live.")
          }
          refreshing={isFetching}
          onRefresh={() => void refetch()}
          onBack={exitDisplay}
        />
      </div>,
    );
  }

  const subtitle = buildSubtitle(
    data.tournament.name,
    featuredMatch,
    isOfficial,
    pinnedCourtLabel,
    isPartnerEvent,
  );
  const isLiveNow = isMatchLiveForTournament(
    featuredMatch.status ?? "pending",
    data.tournament.status,
  );

  return wrapStage(
    <div
      className="relative h-full min-h-0 animate-in fade-in overflow-hidden duration-500"
      key={slideKey}
    >
      {isLiveNow ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-500/40 bg-red-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Live
        </div>
      ) : null}
      {activeMatches.length > 1 && !isPinned ? (
        <p className="pointer-events-none absolute right-4 top-4 z-10 text-xs text-white/50 sm:right-6">
          Court {featuredIndex % activeMatches.length + 1} of {activeMatches.length}
        </p>
      ) : null}
      {(() => {
        const gamesMode = resolveGamesDisplayMode(data.scoring, featuredMatch);
        if (gamesMode) {
          return (
            <LiveGameRaceDisplay
              teamAName={featuredMatch.teamAName}
              teamBName={featuredMatch.teamBName}
              gamesA={featuredMatch.scoreA ?? 0}
              gamesB={featuredMatch.scoreB ?? 0}
              pointsA={gamesMode.pointsA}
              pointsB={gamesMode.pointsB}
              raceToGames={gamesMode.raceToGames}
              pointsToWinGame={gamesMode.pointsToWinGame}
              lengthMode={gamesMode.lengthMode}
              classicSets={gamesMode.classicSets}
              gameDecider={gamesMode.gameDecider}
              startedAt={featuredMatch.startedAt}
              timerEndsAt={featuredMatch.timerEndsAt}
              estimatedDurationMinutes={data.scoring?.roundDurationMinutes ?? null}
              scorekeeperName={featuredMatch.scorekeeperName}
              courtLabel={subtitle?.split("•")[0]?.trim() ?? null}
              subtitle={subtitle}
              className="bg-transparent"
            />
          );
        }
        return (
          <LiveScoreboardDisplay
            teamAName={featuredMatch.teamAName}
            teamBName={featuredMatch.teamBName}
            scoreA={featuredMatch.scoreA ?? 0}
            scoreB={featuredMatch.scoreB ?? 0}
            subtitle={subtitle}
            className="bg-transparent"
          />
        );
      })()}
    </div>,
  );
}
