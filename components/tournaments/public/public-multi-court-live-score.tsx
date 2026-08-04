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

function PublicGroupStageLiveCourts({
  activeMatches,
  courts,
  gameRules,
}: {
  activeMatches: ReclubMatchView[];
  courts: NonNullable<TournamentLivePayload["courts"]>;
  gameRules: ReturnType<typeof getTournamentGameRules> | null;
}) {
  return (
    <section className="rounded-2xl border border-cp-primary/25 bg-cp-card p-4 sm:p-6">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cp-primary">
        <Radio className="h-4 w-4 animate-pulse" />
        {activeMatches.length} court{activeMatches.length === 1 ? "" : "s"} live
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {activeMatches.map((match) => {
          const pointsA = match.gameState?.currentPointsA ?? 0;
          const pointsB = match.gameState?.currentPointsB ?? 0;
          return (
            <li
              key={match.id}
              className="rounded-xl border border-cp-primary/20 bg-cp-elevated/20 p-3 sm:p-4"
            >
              <p className="text-xs text-cp-muted">
                {resolveCourtLabel(match.courtId, courts)}
              </p>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3">
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {match.teamAName ?? "TBD"}
                  </p>
                  {match.teamAPlayers?.length ? (
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-cp-muted sm:text-[11px]">
                      {formatPlayerNameList(match.teamAPlayers)}
                    </p>
                  ) : null}
                </div>

                <div className="flex min-w-[4.5rem] flex-col items-center justify-center px-1 sm:min-w-[5.5rem]">
                  {gameRules ? (
                    <>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-cp-muted">
                        Games
                      </p>
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {match.scoreA ?? 0}
                        <span className="mx-1 font-normal text-cp-muted">–</span>
                        {match.scoreB ?? 0}
                      </p>
                      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-cp-primary">
                        Points
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                        {pointsA}
                        <span className="mx-1.5 font-light text-cp-muted">:</span>
                        {pointsB}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                      {match.scoreA ?? 0}
                      <span className="mx-1.5 font-light text-cp-muted">:</span>
                      {match.scoreB ?? 0}
                    </p>
                  )}
                </div>

                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {match.teamBName ?? "TBD"}
                  </p>
                  {match.teamBPlayers?.length ? (
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-cp-muted sm:text-[11px]">
                      {formatPlayerNameList(match.teamBPlayers)}
                    </p>
                  ) : null}
                </div>
              </div>

              {gameRules ? (
                <p className="mt-2 text-center text-[10px] text-cp-muted sm:text-[11px]">
                  Race to {gameRules.raceToGames} · first to {gameRules.pointsToWinGame} pts
                </p>
              ) : null}
            </li>
          );
        })}
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

  const gameRules = useMemo(() => {
    if (getTournamentMatchScoreMode(tournament) !== "games") return null;
    const phase = scopedLiveData?.doubleStage?.phase;
    const stage = phase === "knockout" ? "knockout" : "group";
    return getTournamentGameRules(tournament, stage);
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
    const completedMatches = allMatches.filter((m) => m.status === "completed");
    if (activeMatches.length === 0) {
      if (completedMatches.length > 0) {
        return (
          <FunMatchLiveHub
            roundGroups={groupMatchesByRound(completedMatches, { includeFriendly: false })}
            currentRound={1}
            courts={courts}
            teams={teams}
            matchByCourt={new Map()}
            readOnly
            pointsPerMatch={pointsPerMatch}
            scoringRules={scoringRules}
            gameRules={gameRules}
            maxRounds={maxRounds}
            accentVariant={variant === "official" ? "official" : "fun"}
            isGroupStageMode
          />
        );
      }
      return (
        <PublicLiveScoreEmptyState
          title="Waiting for live group matches"
          description={
            variant === "official"
              ? "When the organizer starts group-stage matches on courts, live scores appear here automatically."
              : "When the organizer starts pool matches from Manage → Live scoring, scores update here in real time."
          }
          tip="Tip: keep this tab open — it refreshes automatically while the event is live. Check the Matches tab for Order of Play."
        />
      );
    }
    return (
      <PublicGroupStageLiveCourts
        activeMatches={activeMatches}
        courts={courts}
        gameRules={gameRules}
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
      maxRounds={maxRounds}
      accentVariant={variant === "official" ? "official" : "fun"}
      isGroupStageMode={false}
    />
  );
}
