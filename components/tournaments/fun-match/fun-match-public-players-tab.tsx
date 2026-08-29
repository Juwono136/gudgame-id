"use client";

import { useMemo } from "react";
import { FunMatchPlayerStandingsTable } from "@/components/tournaments/fun-match/fun-match-standings-table";
import { TournamentParticipantsPanel } from "@/components/tournaments/tournament-participants-panel";
import { getFunMatchCompletedViews } from "@/lib/tournaments/fun-match/session-views";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { computeFunMatchStandings } from "@/lib/tournaments/stats/fun-match-standings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type FunMatchPublicPlayersTabProps = {
  tournament: TournamentDetail;
  liveData: TournamentLivePayload | undefined;
  teams: LobbyTeamView[];
};

export function FunMatchPublicPlayersTab({
  tournament,
  liveData,
  teams,
}: FunMatchPublicPlayersTabProps) {
  const completed = useMemo(() => getFunMatchCompletedViews(liveData), [liveData]);

  const { players, squads } = useMemo(
    () => computeFunMatchStandings(completed, teams),
    [completed, teams],
  );

  const teamScoreByTeamId = useMemo(() => {
    const map: Record<
      string,
      { pointsFor: number; wins: number; losses: number; points: number }
    > = {};
    for (const squad of squads) {
      map[squad.teamId] = {
        pointsFor: squad.pointsFor,
        wins: squad.wins,
        losses: squad.losses,
        points: squad.points,
      };
    }
    return map;
  }, [squads]);

  const profileBase = undefined;

  return (
    <div className="space-y-8">
      <TournamentParticipantsPanel
        sportSlug={tournament.sportSlug}
        slug={tournament.slug}
        tournamentType="fun_match"
        variant="reclub"
        teamScoreByTeamId={teamScoreByTeamId}
      />

      <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
        <p className="mt-1 text-sm text-cp-muted">
          Player standings with W-L-T, win rate, point diff, and match compensation.
        </p>
        <div className="mt-4">
          <FunMatchPlayerStandingsTable
            rows={players}
            profileBasePath={profileBase}
            visibleColumns={["squad", "wlt", "wr", "diff", "g", "p"]}
          />
        </div>
      </section>
    </div>
  );
}
