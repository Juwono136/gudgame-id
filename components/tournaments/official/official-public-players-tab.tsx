"use client";

import { useMemo } from "react";
import { OfficialPlayerStandingsTable } from "@/components/tournaments/official/official-player-standings-table";
import { TournamentParticipantsPanel } from "@/components/tournaments/tournament-participants-panel";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { computeOfficialPlayerStandings } from "@/lib/tournaments/stats/official-standings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type OfficialPublicPlayersTabProps = {
  tournament: TournamentDetail;
  bracketMatches: BracketMatchView[];
  reclubMatches: ReclubMatchView[];
  teams: LobbyTeamView[];
  /** Defaults to official; partner white-label events use fun_match. */
  participantsVariant?: "official" | "reclub";
};

export function OfficialPublicPlayersTab({
  tournament,
  bracketMatches,
  reclubMatches,
  teams,
  participantsVariant = "official",
}: OfficialPublicPlayersTabProps) {
  const { players, squads } = useMemo(
    () => computeOfficialPlayerStandings(bracketMatches, reclubMatches, teams),
    [bracketMatches, reclubMatches, teams],
  );

  const teamScoreByTeamId = useMemo(() => {
    const map: Record<string, { pointsFor: number; wins: number; losses: number; points: number }> = {};
    for (const s of squads) {
      map[s.teamId] = {
        pointsFor: s.pointsFor,
        wins: s.wins,
        losses: s.losses,
        points: s.points,
      };
    }
    return map;
  }, [squads]);

  const isFunMatch = participantsVariant === "reclub";

  return (
    <div className="space-y-8">
      <TournamentParticipantsPanel
        sportSlug={tournament.sportSlug}
        slug={tournament.slug}
        tournamentType={isFunMatch ? "fun_match" : "official"}
        variant={participantsVariant}
        officialBilling={isFunMatch ? null : tournament.officialBilling}
        teamScoreByTeamId={teamScoreByTeamId}
        partnerEvent={Boolean(tournament.partnerId)}
      />

      <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">
          {isFunMatch ? "Player leaderboard" : "Official leaderboard"}
        </h2>
        <p className="mt-1 text-sm text-cp-muted">
          Full standings with ranking points, point differential, and logged scoring activity.
          {tournament.categoryLabel ? (
            <>
              {" "}
              <span className="text-foreground/80">({tournament.categoryLabel})</span>
            </>
          ) : null}
        </p>
        <div className="mt-4">
          <OfficialPlayerStandingsTable rows={players} />
        </div>
      </section>
    </div>
  );
}
