"use client";

import { useMemo } from "react";
import { Radio } from "lucide-react";
import { FunMatchLiveHub } from "@/components/tournaments/fun-match/fun-match-live-hub";
import { getFunMatchSessionViews } from "@/lib/tournaments/fun-match/session-views";
import { formatPlayerNameList } from "@/lib/format/player-names";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import {
  getCurrentSessionRound,
  groupMatchesByRound,
} from "@/lib/tournaments/reclub/round-groups";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  getMaxRounds,
  getTournamentDeuceConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";

export type PublicMultiCourtLiveScoreVariant = "official" | "fun_match";
export type PublicMultiCourtLiveScoreMode = "rounds" | "bracket" | "group_stage";

type PublicMultiCourtLiveScoreProps = {
  tournament: TournamentDetail;
  liveData: TournamentLivePayload | undefined;
  teams: LobbyTeamView[];
  variant?: PublicMultiCourtLiveScoreVariant;
  mode?: PublicMultiCourtLiveScoreMode;
};

function filterLivePayloadByMode(
  liveData: TournamentLivePayload | undefined,
  mode: PublicMultiCourtLiveScoreMode,
): TournamentLivePayload | undefined {
  if (!liveData) return undefined;
  const matches = liveData.matches ?? [];
  if (mode === "bracket") {
    return { ...liveData, matches: matches.filter((m) => m.type === "bracket") };
  }
  if (mode === "group_stage") {
    return { ...liveData, matches: matches.filter((m) => m.type === "group_stage") };
  }
  return {
    ...liveData,
    matches: matches.filter((m) => m.type !== "bracket" && m.type !== "group_stage"),
  };
}

function PublicGroupStageLiveCourts({
  activeMatches,
  courts,
}: {
  activeMatches: ReclubMatchView[];
  courts: NonNullable<TournamentLivePayload["courts"]>;
}) {
  return (
    <section className="rounded-2xl border border-cp-primary/25 bg-cp-card p-4 sm:p-6">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-primary">
        <Radio className="h-4 w-4 animate-pulse" />
        {activeMatches.length} court{activeMatches.length === 1 ? "" : "s"} live
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {activeMatches.map((match) => (
          <li
            key={match.id}
            className="rounded-xl border border-cp-primary/20 bg-cp-elevated/20 p-4"
          >
            <p className="text-xs text-cp-muted">
              {resolveCourtLabel(match.courtId, courts)}
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {match.teamAName ?? "TBD"} vs {match.teamBName ?? "TBD"}
            </p>
            {match.teamAPlayers?.length || match.teamBPlayers?.length ? (
              <p className="mt-1 text-[11px] leading-relaxed text-cp-muted">
                {[formatPlayerNameList(match.teamAPlayers), formatPlayerNameList(match.teamBPlayers)]
                  .filter(Boolean)
                  .join(" vs ")}
              </p>
            ) : null}
            <p className="mt-3 text-center text-3xl font-bold tabular-nums text-foreground">
              {match.scoreA ?? 0} : {match.scoreB ?? 0}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PublicMultiCourtLiveScore({
  tournament,
  liveData,
  teams,
  variant = "fun_match",
  mode = "rounds",
}: PublicMultiCourtLiveScoreProps) {
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const maxRounds = getMaxRounds(tournament);
  const scopedLiveData = useMemo(
    () => filterLivePayloadByMode(liveData, mode),
    [liveData, mode],
  );
  const courts = scopedLiveData?.courts ?? liveData?.courts ?? [];

  const scoringRules = useMemo(
    () => ({
      pointsPerMatch,
      deuceConfig: getTournamentDeuceConfig(tournament),
      scoringType: getTournamentScoringType(tournament),
    }),
    [pointsPerMatch, tournament],
  );

  const gameRules = useMemo(
    () =>
      getTournamentMatchScoreMode(tournament) === "games"
        ? getTournamentGameRules(tournament)
        : null,
    [tournament],
  );

  const allMatches = useMemo(
    () => getFunMatchSessionViews(scopedLiveData),
    [scopedLiveData],
  );

  const activeMatches = useMemo(
    () => allMatches.filter((m) => m.status === "in_progress"),
    [allMatches],
  );

  const currentRound = useMemo(
    () => getCurrentSessionRound(allMatches, activeMatches),
    [allMatches, activeMatches],
  );

  const roundGroups = useMemo(() => {
    return groupMatchesByRound(allMatches, { includeFriendly: false });
  }, [allMatches]);

  const matchByCourt = useMemo(() => {
    const map = new Map<string, ReclubMatchView>();
    for (const m of activeMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
    return map;
  }, [activeMatches]);

  if (mode === "group_stage") {
    if (activeMatches.length === 0) {
      return null;
    }
    return (
      <PublicGroupStageLiveCourts activeMatches={activeMatches} courts={courts} />
    );
  }

  const hasContent =
    roundGroups.length > 0 ||
    activeMatches.length > 0 ||
    allMatches.some((m) => m.status === "completed");
  const emptyCopy =
    variant === "official"
      ? "Official live scores appear here when the host starts play on each court."
      : "Match rounds appear here when the host starts play. Each court shows squad names and player lineups.";

  if (!hasContent) {
    return (
      <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 p-6 text-center sm:p-10">
        <p className="text-sm text-cp-muted">{emptyCopy}</p>
      </section>
    );
  }

  return (
    <FunMatchLiveHub
      roundGroups={roundGroups}
      currentRound={currentRound}
      courts={courts}
      teams={teams}
      matchByCourt={matchByCourt}
      readOnly
      pointsPerMatch={pointsPerMatch}
      scoringRules={scoringRules}
      gameRules={gameRules}
      maxRounds={maxRounds}
      accentVariant={variant === "official" ? "official" : "fun"}
      isGroupStageMode={false}
    />
  );
}
