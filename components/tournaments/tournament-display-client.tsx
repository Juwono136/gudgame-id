"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Maximize2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { TournamentDisplayLayout } from "@/lib/tournaments/settings";

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
};

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
) {
  if (match.type === "bracket") {
    const round = match.roundNumber != null ? `Round ${match.roundNumber}` : "Bracket";
    const matchNo =
      match.matchNumber != null ? ` · Match ${match.matchNumber}` : "";
    return `${tournamentName} · ${round}${matchNo}`;
  }

  if (match.type === "lobby_round" || match.type === "americano_round") {
    return `${tournamentName} · Live Round ${match.roundNumber ?? ""}`.trim();
  }

  return isOfficial
    ? `${tournamentName} · Official live`
    : `${tournamentName} · Fun Match live`;
}

export function TournamentDisplayClient({
  sportSlug,
  slug,
  backHref,
}: TournamentDisplayClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const layoutParam = searchParams.get("layout") as TournamentDisplayLayout | null;
  const { data, isLoading, isError, refetch, isFetching } = useTournamentLive(
    sportSlug,
    slug,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const layout: TournamentDisplayLayout = useMemo(() => {
    const cfg = data?.displayConfig;
    if (cfg?.autoRotate || cfg?.layout === "rotation") return "rotation";
    if (layoutParam) return layoutParam;
    return (cfg?.layout as TournamentDisplayLayout | undefined) ?? (isOfficialType(data?.tournament.tournamentType ?? "") ? "single" : "multi_court");
  }, [data?.displayConfig, data?.tournament.tournamentType, layoutParam]);

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

  const activeMatch = useMemo(
    () => pickActiveMatch(data?.matches ?? [], matchId, data?.tournament.status),
    [data?.matches, data?.tournament.status, matchId],
  );

  const featuredMatch = useMemo(() => {
    if (activeMatches.length > 1) {
      return activeMatches[featuredIndex % activeMatches.length] ?? activeMatch;
    }
    return activeMatch;
  }, [activeMatch, activeMatches, featuredIndex]);

  useEffect(() => {
    if (effectiveLayout !== "single" || activeMatches.length <= 1) return;
    const id = setInterval(() => {
      setFeaturedIndex((i) => i + 1);
    }, 10_000);
    return () => clearInterval(id);
  }, [activeMatches.length, effectiveLayout]);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [activeMatches.map((m) => m.id).join(",")]);

  const isOfficial = isOfficialType(data?.tournament.tournamentType);

  const displayControls = (
    <div className="fixed bottom-4 right-4 flex gap-2 opacity-80 transition-opacity hover:opacity-100">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shadow-lg"
        onClick={() => void refetch()}
      >
        {isFetching ? "…" : "Refresh"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shadow-lg"
        onClick={() => void enterFullscreen()}
      >
        <Maximize2 className="mr-1.5 h-4 w-4" />
        Fullscreen
      </Button>
      <Button type="button" size="sm" variant="secondary" className="shadow-lg" onClick={exitDisplay}>
        Exit
      </Button>
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
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
        <Button asChild variant="ghost">
          <Link href={tournamentUrl}>Back to tournament</Link>
        </Button>
      </DisplayVenueShell>
    );
  }

  const slideKey = `${effectiveLayout}-${rotationIndex}`;

  const shellContent = (() => {
    switch (effectiveLayout) {
      case "multi_court": {
        const courtList = data.courts ?? [];
        const matchesOnCourts = activeMatches;
        return (
          <div ref={containerRef} className="animate-in fade-in min-h-dvh duration-700 p-3 sm:p-6" key={slideKey}>
            {matchesOnCourts.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={matchesOnCourts.length}
              >
                {matchesOnCourts.map((m) => {
                  const court = courtList.find((c) => c.id === m.courtId);
                  const courtLabel =
                    court?.name ??
                    (m.type === "bracket"
                      ? `Bracket · R${m.roundNumber ?? "?"}${m.matchNumber != null ? ` M${m.matchNumber}` : ""}`
                      : "Court");
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
                      subtitle={buildSubtitle(data.tournament.name, m, isOfficial)}
                    />
                  );
                })}
              </MultiCourtDisplayGrid>
            ) : courtList.length > 0 ? (
              <MultiCourtDisplayGrid
                tournamentName={data.tournament.name}
                courtCount={courtList.length}
              >
                {courtList.map((court) => (
                  <div
                    key={court.id}
                    className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-6 text-center"
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
                      {court.name}
                    </p>
                    <p className="mt-2 text-xs text-white/40">Waiting for match</p>
                  </div>
                ))}
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
      <DisplayVenueShell className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <Radio className="h-10 w-10 text-white/40" />
        <p className="text-lg font-medium">{data.tournament.name}</p>
        <p className="max-w-md text-sm text-white/60">
          {data.phase === "live"
            ? "No active match on the scoreboard yet. Start a lobby round or bracket match — this screen updates automatically."
            : (data.message ??
              "No live match to display yet. Check back when the tournament is live.")}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button type="button" variant="ghost" onClick={exitDisplay}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </DisplayVenueShell>
    );
  }

  const subtitle = buildSubtitle(data.tournament.name, featuredMatch, isOfficial);
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
        {activeMatches.length > 1 ? (
          <p className="pointer-events-none absolute right-6 top-6 z-10 text-xs text-white/50">
            Court {featuredIndex % activeMatches.length + 1} of {activeMatches.length}
          </p>
        ) : null}
        <LiveScoreboardDisplay
          teamAName={featuredMatch.teamAName}
          teamBName={featuredMatch.teamBName}
          scoreA={featuredMatch.scoreA ?? 0}
          scoreB={featuredMatch.scoreB ?? 0}
          subtitle={subtitle}
          className="bg-transparent"
        />
        {displayControls}
      </div>
    </DisplayVenueShell>
  );
}
