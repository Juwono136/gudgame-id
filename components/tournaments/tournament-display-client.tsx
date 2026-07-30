"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisplayIdleScoreboard } from "@/components/tournaments/display/display-idle-scoreboard";
import { DisplayOrderOfPlayStrip } from "@/components/tournaments/display/display-order-of-play-strip";
import { DisplaySessionLeaderboard } from "@/components/tournaments/display/display-session-leaderboard";
import { DisplayVenueButton } from "@/components/tournaments/display/display-venue-button";
import { LiveGameRaceDisplay } from "@/components/tournaments/game-race-scoreboard";
import { LiveScoreboardDisplay } from "@/components/tournaments/live-scoreboard";
import {
  MULTI_COURT_PER_SLIDE,
  MULTI_COURT_SLIDE_INTERVAL_MS,
  MultiCourtDisplayCard,
  MultiCourtDisplayGrid,
  MultiCourtWaitingCard,
} from "@/components/tournaments/display-multi-court-grid";
import { DisplayVenueShell } from "@/components/tournaments/display-venue-shell";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { publicSportRoutes } from "@/lib/constants/routes";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { isMatchLiveForTournament } from "@/lib/tournaments/match-display-status";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import type { MatchGameState } from "@/lib/tournaments/scoring/game-mode";
import type { TournamentDisplayLayout } from "@/lib/tournaments/settings";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import {
  parseCallStatus,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";

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
  gameState?: MatchGameState | null;
};

function resolveGamesDisplayMode(
  scoring: TournamentLivePayload["scoring"] | undefined,
  match: LiveMatchView | null | undefined,
):
  | {
      pointsA: number;
      pointsB: number;
      raceToGames: number;
      pointsToWinGame: number;
    }
  | undefined {
  if (!scoring || scoring.matchScoreMode !== "games" || !scoring.raceToGames) {
    return undefined;
  }
  return {
    pointsA: match?.gameState?.currentPointsA ?? 0,
    pointsB: match?.gameState?.currentPointsB ?? 0,
    raceToGames: scoring.raceToGames,
    pointsToWinGame: scoring.pointsToWinGame ?? 40,
  };
}

const ROTATION_LAYOUTS: TournamentDisplayLayout[] = [
  "multi_court",
  "single",
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
  const containerRef = useRef<HTMLDivElement>(null);
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
    const el = containerRef.current;
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

  const multiCourtItemCount =
    sortedCourts.length > 0 ? sortedCourts.length : activeMatches.length;
  const multiCourtSlideCount = Math.max(
    1,
    Math.ceil(multiCourtItemCount / MULTI_COURT_PER_SLIDE),
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
    sortedCourts.map((c) => c.id).join(","),
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

  const orderOfPlayRows = useMemo((): ScheduleMatchRow[] => {
    if (!data) return [];
    const courts = data.courts ?? [];
    const courtNameFor = (courtId: string | null | undefined) => {
      if (!courtId) return null;
      const label = resolveCourtLabel(courtId, courts);
      return label === "Court —" ? null : label;
    };

    const fromLive = ((data.matches ?? []) as LiveMatchView[]).map((m) => ({
      id: m.id,
      kind: (m.type === "group" ? "group" : "bracket") as "group" | "bracket",
      stageLabel:
        m.type === "group"
          ? "Group"
          : `R${m.roundNumber ?? "?"}${m.matchNumber != null ? ` · M${m.matchNumber}` : ""}`,
      teamAName: m.teamAName ?? null,
      teamBName: m.teamBName ?? null,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      status: m.status ?? "pending",
      scheduledAt: null,
      courtId: m.courtId ?? null,
      courtName: courtNameFor(m.courtId),
      playOrder: null,
      callStatus: parseCallStatus(null),
    }));

    type DsGroup = {
      name?: string;
      matches?: Array<{
        id: string;
        teamAName: string | null;
        teamBName: string | null;
        scoreA: number | null;
        scoreB: number | null;
        status: string;
        scheduledAt?: string | null;
        courtId?: string | null;
        playOrder?: number | null;
        callStatus?: string | null;
      }>;
    };
    const groups = (data.doubleStage?.groups ?? []) as DsGroup[];
    const fromGroups: ScheduleMatchRow[] = groups.flatMap((g) =>
      (g.matches ?? []).map((m) => ({
        id: m.id,
        kind: "group" as const,
        stageLabel: `Group · ${g.name ?? ""}`,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        scheduledAt: m.scheduledAt ?? null,
        courtId: m.courtId ?? null,
        courtName: courtNameFor(m.courtId),
        playOrder: m.playOrder ?? null,
        callStatus: parseCallStatus(m.callStatus),
      })),
    );

    const bracketMatches = (data.bracket?.matches as LiveMatchView[]) ?? [];
    const totalRounds = bracketMatches.length
      ? Math.max(...bracketMatches.map((m) => m.roundNumber ?? 1), 1)
      : 1;
    const fromBracket: ScheduleMatchRow[] = bracketMatches.map((m) => ({
      id: m.id,
      kind: "bracket" as const,
      stageLabel: getBracketRoundLabel(m.roundNumber ?? 1, totalRounds),
      teamAName: m.teamAName ?? null,
      teamBName: m.teamBName ?? null,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      status: m.status ?? "pending",
      scheduledAt: null,
      courtId: m.courtId ?? null,
      courtName: courtNameFor(m.courtId),
      playOrder: null,
      callStatus: parseCallStatus(null),
    }));

    // Prefer structured group+bracket rows when double-stage payload exists.
    if (fromGroups.length || fromBracket.length) {
      const seen = new Set<string>();
      const merged: ScheduleMatchRow[] = [];
      for (const row of [...fromGroups, ...fromBracket]) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
      }
      return merged;
    }
    return fromLive;
  }, [data]);

  const oopStrip =
    orderOfPlayRows.length > 0 ? (
      <DisplayOrderOfPlayStrip matches={orderOfPlayRows} />
    ) : null;

  const displayControls = (
    <div className="fixed bottom-4 right-4 flex gap-2 opacity-90 transition-opacity hover:opacity-100">
      <DisplayVenueButton type="button" size="sm" onClick={() => void refetch()}>
        {isFetching ? "…" : "Refresh"}
      </DisplayVenueButton>
      <DisplayVenueButton type="button" size="sm" onClick={() => void enterFullscreen()}>
        <Maximize2 className="mr-1.5 h-4 w-4" />
        Fullscreen
      </DisplayVenueButton>
      <DisplayVenueButton type="button" size="sm" onClick={exitDisplay}>
        Exit
      </DisplayVenueButton>
    </div>
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

  const shellContent = (() => {
    switch (effectiveLayout) {
      case "multi_court": {
        const courtList = sortedCourts;
        const matchByCourtId = new Map(
          activeMatches
            .filter((m) => m.courtId)
            .map((m) => [m.courtId as string, m]),
        );
        const slide = multiCourtSlide % multiCourtSlideCount;
        const pageStart = slide * MULTI_COURT_PER_SLIDE;
        const visibleCourts = courtList.slice(pageStart, pageStart + MULTI_COURT_PER_SLIDE);
        const visibleMatches = activeMatches.slice(
          pageStart,
          pageStart + MULTI_COURT_PER_SLIDE,
        );
        return (
          <div
            ref={containerRef}
            className="animate-in fade-in h-full min-h-0 overflow-hidden duration-700"
            key={`${slideKey}-mc-${slide}`}
          >
            {courtList.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={visibleCourts.length}
                slideIndex={slide}
                slideCount={multiCourtSlideCount}
              >
                {visibleCourts.map((court) => {
                  const m = matchByCourtId.get(court.id);
                  if (m?.teamAName && m.teamBName) {
                    const gamesMode = resolveGamesDisplayMode(data.scoring, m);
                    return (
                      <MultiCourtDisplayCard
                        key={court.id}
                        courtName={court.name}
                        teamAName={m.teamAName}
                        teamBName={m.teamBName}
                        teamAPlayers={m.teamAPlayers}
                        teamBPlayers={m.teamBPlayers}
                        scoreA={m.scoreA ?? 0}
                        scoreB={m.scoreB ?? 0}
                        gamesMode={gamesMode}
                        subtitle={buildSubtitle(data.tournament.name, m, isOfficial, court.name)}
                      />
                    );
                  }
                  return <MultiCourtWaitingCard key={court.id} courtName={court.name} />;
                })}
              </MultiCourtDisplayGrid>
            ) : activeMatches.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={visibleMatches.length}
                slideIndex={slide}
                slideCount={multiCourtSlideCount}
              >
                {visibleMatches.map((m) => {
                  const court = courtList.find((c) => c.id === m.courtId);
                  const courtLabel =
                    court?.name ??
                    (m.type === "bracket"
                      ? `Bracket · R${m.roundNumber ?? "?"}${m.matchNumber != null ? ` M${m.matchNumber}` : ""}`
                      : "Court");
                  const gamesMode = resolveGamesDisplayMode(data.scoring, m);
                  return (
                    <MultiCourtDisplayCard
                      key={m.id}
                      courtName={courtLabel}
                      teamAName={m.teamAName!}
                      teamBName={m.teamBName!}
                      teamAPlayers={m.teamAPlayers}
                      teamBPlayers={m.teamBPlayers}
                      scoreA={m.scoreA ?? 0}
                      scoreB={m.scoreB ?? 0}
                      gamesMode={gamesMode}
                      subtitle={buildSubtitle(data.tournament.name, m, isOfficial, courtLabel)}
                    />
                  );
                })}
              </MultiCourtDisplayGrid>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-sm text-white/60">
                No courts configured yet.
              </p>
            )}
            {displayControls}
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
        for (const squad of data.players ?? []) {
          playersByTeam.set(
            squad.teamId,
            squad.members.map((m) => m.name?.trim() || "Player").filter(Boolean),
          );
        }
        const leaderboardRows =
          teamRows.length > 0
            ? teamRows.map((t) => ({
                id: t.teamId ?? t.name,
                name: t.name,
                subtitle: (t.teamId ? playersByTeam.get(t.teamId) : undefined)?.join(", "),
                stats: `${t.wins}W · ${t.pointsFor} pts`,
              }))
            : playerRows.map((p) => ({
                id: p.userId,
                name: p.displayName,
                subtitle: p.teamName,
                stats: `${p.teamPointsFor} pts`,
              }));

        return (
          <div ref={containerRef} className="relative" key={slideKey}>
            <DisplaySessionLeaderboard
              tournamentName={data.tournament.name}
              title="Session leaderboard"
              rows={leaderboardRows}
            />
            {displayControls}
          </div>
        );
      }

      case "bracket": {
        const bracketMatches = (data.bracket?.matches as LiveMatchView[]) ?? [];
        return (
          <div ref={containerRef} className="animate-in fade-in duration-700 p-6" key={slideKey}>
            <h1 className="text-2xl font-bold text-white">{data.tournament.name}</h1>
            <p className="mt-1 text-sm text-white/60">
              Bracket ·{" "}
              {
                bracketMatches.filter((m) =>
                  isMatchLiveForTournament(m.status ?? "pending", data.tournament.status),
                ).length
              }{" "}
              live
            </p>
            {bracketMatches.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bracketMatches.slice(0, 16).map((m) => (
                  <div
                    key={m.id}
                    className={
                      isMatchLiveForTournament(m.status ?? "pending", data.tournament.status)
                        ? "rounded-xl border border-red-500/40 bg-red-950/30 p-4 backdrop-blur-sm"
                        : "rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                    }
                  >
                    <p className="text-xs text-white/50">
                      R{m.roundNumber} · M{m.matchNumber}
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {m.teamAName ?? "TBD"} <span className="text-white/40">vs</span>{" "}
                      {m.teamBName ?? "TBD"}
                    </p>
                    <p className="mt-2 font-mono text-2xl text-white">
                      {m.scoreA ?? 0} – {m.scoreB ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-12 text-center text-sm text-white/50">
                Bracket matches will appear here once generated.
              </p>
            )}
            {displayControls}
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
    return (
      <DisplayVenueShell
        lockViewport={effectiveLayout === "multi_court"}
        brandTheme={brandTheme}
      >
        {brandBadge}
        {oopStrip}
        {shellContent}
      </DisplayVenueShell>
    );
  }

  if (!featuredMatch?.teamAName || !featuredMatch?.teamBName) {
    return (
      <DisplayVenueShell brandTheme={brandTheme}>
        {brandBadge}
        {oopStrip}
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
      </DisplayVenueShell>
    );
  }

  const subtitle = buildSubtitle(
    data.tournament.name,
    featuredMatch,
    isOfficial,
    pinnedCourtLabel,
  );
  const isLiveNow = isMatchLiveForTournament(
    featuredMatch.status ?? "pending",
    data.tournament.status,
  );

  return (
    <DisplayVenueShell brandTheme={brandTheme}>
      {brandBadge}
      {oopStrip}
      <div ref={containerRef} className="relative animate-in fade-in duration-700" key={slideKey}>
        {isLiveNow ? (
          <div className="pointer-events-none absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-500/40 bg-red-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            Live
          </div>
        ) : null}
        {activeMatches.length > 1 && !isPinned ? (
          <p className="pointer-events-none absolute right-6 top-6 z-10 text-xs text-white/50">
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
        {displayControls}
      </div>
    </DisplayVenueShell>
  );
}
