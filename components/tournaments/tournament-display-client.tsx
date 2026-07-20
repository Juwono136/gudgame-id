"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisplayIdleScoreboard } from "@/components/tournaments/display/display-idle-scoreboard";
import { DisplayVenueButton } from "@/components/tournaments/display/display-venue-button";
import { LiveGameRaceDisplay } from "@/components/tournaments/game-race-scoreboard";
import { LiveScoreboardDisplay } from "@/components/tournaments/live-scoreboard";
import {
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
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";

type TournamentDisplayClientProps = {
  sportSlug: string;
  slug: string;
  backHref?: string;
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
          <Link href={tournamentUrl}>Back to tournament</Link>
        </DisplayVenueButton>
      </DisplayVenueShell>
    );
  }

  const slideKey = `${effectiveLayout}-${rotationIndex}`;

  const shellContent = (() => {
    switch (effectiveLayout) {
      case "multi_court": {
        const courtList = [...(data.courts ?? [])].sort(
          (a, b) => (a.sortOrder ?? a.courtNumber) - (b.sortOrder ?? b.courtNumber),
        );
        const matchByCourtId = new Map(
          activeMatches
            .filter((m) => m.courtId)
            .map((m) => [m.courtId as string, m]),
        );
        return (
          <div ref={containerRef} className="animate-in fade-in min-h-dvh duration-700 p-3 sm:p-6" key={slideKey}>
            {courtList.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={courtList.length}
              >
                {courtList.map((court) => {
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
                  return (
                    <div
                      key={court.id}
                      className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-6 text-center"
                    >
                      <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
                        {court.name}
                      </p>
                      <p className="mt-2 text-xs text-white/40">Waiting for match</p>
                    </div>
                  );
                })}
              </MultiCourtDisplayGrid>
            ) : activeMatches.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={activeMatches.length}
              >
                {activeMatches.map((m) => {
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
              <p className="text-center text-sm text-white/60">No courts configured yet.</p>
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
        return (
          <div ref={containerRef} className="animate-in fade-in duration-700 p-6" key={slideKey}>
            <h1 className="text-2xl font-bold text-white">{data.tournament.name}</h1>
            <p className="mt-1 text-sm text-white/60">Session leaderboard</p>
            {teamRows.length > 0 ? (
              <ul className="mt-8 space-y-2">
                {teamRows.slice(0, 12).map((t, i) => (
                  <li
                    key={t.teamId ?? t.name}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                  >
                    <span className="text-white">
                      <span className="mr-3 text-white/40">#{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="font-mono text-lg text-white">
                      {t.wins}W · {t.pointsFor} pts
                    </span>
                  </li>
                ))}
              </ul>
            ) : playerRows.length > 0 ? (
              <ul className="mt-8 space-y-2">
                {playerRows.slice(0, 12).map((p, i) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                  >
                    <span className="min-w-0 break-words text-white">
                      <span className="mr-3 text-white/40">#{i + 1}</span>
                      {p.displayName}
                      <span className="ml-2 text-sm text-white/50">({p.teamName})</span>
                    </span>
                    <span className="shrink-0 font-mono text-lg text-white">{p.teamPointsFor} pts</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-12 text-center text-sm text-white/50">
                Standings appear after the first match is scored.
              </p>
            )}
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
    return <DisplayVenueShell>{shellContent}</DisplayVenueShell>;
  }

  if (!featuredMatch?.teamAName || !featuredMatch?.teamBName) {
    return (
      <DisplayVenueShell>
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
    <DisplayVenueShell>
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
