"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Maximize2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveScoreboardDisplay } from "@/components/tournaments/live-scoreboard";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { publicSportRoutes } from "@/lib/constants/routes";
import { isOfficialType } from "@/lib/tournaments/core/types";

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
  scoreA?: number | null;
  scoreB?: number | null;
  status?: string;
};

function pickActiveMatch(
  matches: LiveMatchView[],
  matchId: string | null,
): LiveMatchView | null {
  if (!matches.length) return null;

  if (matchId) {
    const targeted = matches.find((m) => String(m.id) === matchId);
    if (targeted?.teamAName && targeted?.teamBName) return targeted;
  }

  const inProgress = matches.find(
    (m) => m.status === "in_progress" && m.teamAName && m.teamBName,
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
  const { data, isLoading, isError, refetch, isFetching } = useTournamentLive(
    sportSlug,
    slug,
  );
  const containerRef = useRef<HTMLDivElement>(null);

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

  const activeMatch = useMemo(
    () => pickActiveMatch(data?.matches ?? [], matchId),
    [data?.matches, matchId],
  );

  const isOfficial = isOfficialType(data?.tournament.tournamentType);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1a] text-white/70">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0f1a] px-6 text-white">
        <p className="text-sm text-white/70">Could not load scoreboard.</p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
        <Button asChild variant="ghost">
          <Link href={tournamentUrl}>Back to tournament</Link>
        </Button>
      </div>
    );
  }

  if (!activeMatch?.teamAName || !activeMatch?.teamBName) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0f1a] px-6 text-center text-white">
        <Radio className="h-10 w-10 text-white/40" />
        <p className="text-lg font-medium">{data.tournament.name}</p>
        <p className="max-w-md text-sm text-white/60">
          {data.phase === "live"
            ? "No active match on the scoreboard yet. Start a lobby round or bracket match, then refresh this screen."
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
      </div>
    );
  }

  const subtitle = buildSubtitle(data.tournament.name, activeMatch, isOfficial);
  const isLiveNow = activeMatch.status === "in_progress";

  return (
    <div ref={containerRef} className="relative min-h-dvh bg-[#0a0f1a]">
      {isLiveNow ? (
        <div className="pointer-events-none absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-500/40 bg-red-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Live
        </div>
      ) : null}
      <LiveScoreboardDisplay
        teamAName={activeMatch.teamAName}
        teamBName={activeMatch.teamBName}
        scoreA={activeMatch.scoreA ?? 0}
        scoreB={activeMatch.scoreB ?? 0}
        subtitle={subtitle}
      />
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
    </div>
  );
}
