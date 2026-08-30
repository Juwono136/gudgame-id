"use client";

import { useMemo } from "react";
import { Radio } from "lucide-react";
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
  getTournamentClassicSetRules,
  getTournamentDeuceConfig,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
  isClassicSetsFormat,
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

function PublicLiveScoreEmptyState({
  title,
  description,
  tip,
}: {
  title: string;
  description: string;
  tip?: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/70 px-4 py-10 text-center sm:px-8 sm:py-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cp-primary/10 text-cp-primary">
        <Radio className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cp-muted">{description}</p>
      {tip ? (
        <p className="mx-auto mt-4 max-w-sm rounded-xl border border-cp-border/70 bg-cp-elevated/40 px-3 py-2 text-xs text-cp-muted">
          {tip}
        </p>
      ) : null}
    </section>
  );
}

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

  const gameRules = useMemo(() => {
    const phase = scopedLiveData?.doubleStage?.phase;
    const stage =
      phase === "knockout" ? "knockout" : phase === "group" ? "group" : "default";
    // Classic sets still uses the games engine for rally points, but race-to labels
    // must not win — FunMatchLiveHub prefers classicSetRules when present.
    if (getTournamentMatchScoreMode(tournament, stage) !== "games") return null;
    return getTournamentGameRules(tournament, stage);
  }, [tournament, scopedLiveData?.doubleStage?.phase]);

  const classicSetRules = useMemo(() => {
    const phase = scopedLiveData?.doubleStage?.phase;
    const stage =
      phase === "knockout" ? "knockout" : phase === "group" ? "group" : "default";
    return isClassicSetsFormat(tournament, stage)
      ? getTournamentClassicSetRules(tournament, stage)
      : null;
  }, [tournament, scopedLiveData?.doubleStage?.phase]);

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
    // Pool standings live only on the Groups tab — Live Score is court/match scores only.
    if (allMatches.length === 0) {
      return (
        <PublicLiveScoreEmptyState
          title="Waiting for live group matches"
          description={
            variant === "official"
              ? "When the organizer starts group-stage matches on courts, live scores appear here automatically."
              : "When the organizer starts pool matches from Manage → Live scoring, scores update here in real time."
          }
          tip="Tip: keep this tab open — it refreshes automatically. Pool tables are on the Groups tab; check Matches for Order of Play."
        />
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
        classicSetRules={classicSetRules}
        maxRounds={maxRounds}
        accentVariant={variant === "official" ? "official" : "fun"}
        isGroupStageMode
      />
    );
  }

  const hasContent =
    roundGroups.length > 0 ||
    activeMatches.length > 0 ||
    allMatches.some((m) => m.status === "completed");
  const emptyCopy =
    variant === "official"
      ? "When the organizer starts play on each court, live scores appear here automatically."
      : "When the organizer starts rounds from Manage → Live scoring, each court shows squad names and scores here.";

  if (!hasContent) {
    return (
      <PublicLiveScoreEmptyState
        title="No live scores yet"
        description={emptyCopy}
        tip="Tip: this view stays in sync with the manage console — scores appear as soon as a match is in progress."
      />
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
      classicSetRules={classicSetRules}
      maxRounds={maxRounds}
      accentVariant={variant === "official" ? "official" : "fun"}
      isGroupStageMode={false}
    />
  );
}
