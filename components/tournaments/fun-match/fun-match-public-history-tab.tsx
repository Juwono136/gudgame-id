"use client";

import { useMemo } from "react";
import { BarChart3, History } from "lucide-react";
import {
  FunMatchPlayerStandingsTable,
  FunMatchSquadStandingsTable,
} from "@/components/tournaments/fun-match/fun-match-standings-table";
import { FunMatchPublicBracketTab } from "@/components/tournaments/fun-match/fun-match-public-bracket-tab";
import { TournamentRoundHistorySection } from "@/components/tournaments/tournament-round-history-section";
import { getFunMatchCompletedViews } from "@/lib/tournaments/fun-match/session-views";
import { formatStatDuration } from "@/lib/tournaments/stats/compute";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { computeFunMatchStandings } from "@/lib/tournaments/stats/fun-match-standings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type FunMatchPublicHistoryTabProps = {
  tournament: TournamentDetail;
  liveData: TournamentLivePayload | undefined;
  teams: LobbyTeamView[];
  userTeamId: string | null;
  isElimination: boolean;
};

export function FunMatchPublicHistoryTab({
  tournament,
  liveData,
  teams,
  userTeamId,
  isElimination,
}: FunMatchPublicHistoryTabProps) {
  const completed = useMemo(() => getFunMatchCompletedViews(liveData), [liveData]);

  const { players, squads } = useMemo(
    () => computeFunMatchStandings(completed, teams),
    [completed, teams],
  );

  const profileBase = undefined;
  const sessionHistory = liveData?.matchHistory ?? [];

  const historyItems = useMemo(
    () =>
      sessionHistory.map((m) => {
        const scoreParts = m.score.split(/[–-]/).map((s) => Number(s.trim()) || 0);
        return {
          id: m.id,
          roundLabel: m.label,
          teamAName: m.teamAName ?? m.summary?.split(" vs ")?.[0] ?? null,
          teamBName: m.teamBName ?? m.summary?.split(" vs ")?.[1] ?? null,
          teamAPlayers: m.teamAPlayers ?? [],
          teamBPlayers: m.teamBPlayers ?? [],
          scoreA: scoreParts[0] ?? 0,
          scoreB: scoreParts[1] ?? 0,
          status: "completed" as const,
        };
      }),
    [sessionHistory],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          Session stats
        </h2>
        <p className="mt-1 text-sm text-cp-muted">
          Squad and player standings from every finalized match in this session.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Matches played", value: String(completed.length) },
            {
              label: "Squads",
              value: String(teams.filter((t) => t.memberCount > 0).length),
            },
            {
              label: "Players",
              value: String(teams.reduce((n, t) => n + t.memberCount, 0)),
            },
            {
              label: "Avg match time",
              value: formatStatDuration(liveData?.playerStats?.avgDurationSeconds ?? null),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-cp-border/80 bg-cp-elevated/25 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                {item.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Squad standings</h3>
            <div className="mt-3">
              <FunMatchSquadStandingsTable rows={squads} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Player standings</h3>
            <div className="mt-3">
              <FunMatchPlayerStandingsTable rows={players} profileBasePath={profileBase} />
            </div>
          </div>
        </div>
      </section>

      {historyItems.length > 0 ? (
        <TournamentRoundHistorySection
          variant="reclub"
          title="Session history"
          items={historyItems}
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 p-6 text-center">
          <History className="mx-auto h-6 w-6 text-cp-muted/50" />
          <p className="mt-2 text-sm text-cp-muted">
            Session match history appears after rounds are finalized.
          </p>
        </section>
      )}

      {isElimination ? (
        <section>
          <h3 className="mb-4 text-base font-semibold text-foreground">Bracket history</h3>
          <FunMatchPublicBracketTab
            sportSlug={tournament.sportSlug}
            slug={tournament.slug}
            userTeamId={userTeamId}
            historyOnly
          />
        </section>
      ) : null}
    </div>
  );
}
