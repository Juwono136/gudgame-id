"use client";

import { useMemo } from "react";
import { FunMatchLiveHub } from "@/components/tournaments/fun-match/fun-match-live-hub";
import { getFunMatchSessionViews } from "@/lib/tournaments/fun-match/session-views";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import {
  getCurrentSessionRound,
  groupMatchesByRound,
} from "@/lib/tournaments/reclub/round-groups";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  getMaxRounds,
  getTournamentDeuceConfig,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
} from "@/lib/tournaments/settings";

type FunMatchPublicLiveScoreProps = {
  tournament: TournamentDetail;
  liveData: TournamentLivePayload | undefined;
  teams: LobbyTeamView[];
};

export function FunMatchPublicLiveScore({
  tournament,
  liveData,
  teams,
}: FunMatchPublicLiveScoreProps) {
  const pointsPerMatch = getTournamentPointsPerMatch(tournament);
  const maxRounds = getMaxRounds(tournament);
  const courts = liveData?.courts ?? [];

  const scoringRules = useMemo(
    () => ({
      pointsPerMatch,
      deuceConfig: getTournamentDeuceConfig(tournament),
      scoringType: getTournamentScoringType(tournament),
    }),
    [pointsPerMatch, tournament],
  );

  const allMatches = useMemo(() => getFunMatchSessionViews(liveData), [liveData]);

  const activeMatches = useMemo(
    () => allMatches.filter((m) => m.status === "in_progress"),
    [allMatches],
  );

  const currentRound = useMemo(
    () => getCurrentSessionRound(allMatches, activeMatches),
    [allMatches, activeMatches],
  );

  const roundGroups = useMemo(
    () => groupMatchesByRound(allMatches, { includeFriendly: false }),
    [allMatches],
  );

  const matchByCourt = useMemo(() => {
    const map = new Map<string, ReclubMatchView>();
    for (const m of activeMatches) {
      if (m.courtId) map.set(m.courtId, m);
    }
    return map;
  }, [activeMatches]);

  const hasContent = roundGroups.length > 0 || activeMatches.length > 0;

  if (!hasContent) {
    return (
      <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 p-6 text-center sm:p-10">
        <p className="text-sm text-cp-muted">
          Match rounds appear here when the host starts play. Each court shows squad names and
          player lineups.
        </p>
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
      maxRounds={maxRounds}
    />
  );
}
