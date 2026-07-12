import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { computeOfficialTournamentStats } from "@/lib/tournaments/stats/from-bracket";
import { computeReclubSessionStatsWithBracket } from "@/lib/tournaments/stats/from-reclub";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentParticipantRow } from "@/lib/tournaments/participants/query";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import { computeTournamentSessionStats } from "@/lib/tournaments/stats/compute";
import { toStatsMatchFromBracket } from "@/lib/tournaments/stats/from-bracket";
import { toStatsMatchFromGroup } from "@/lib/tournaments/stats/from-group";

function participantsFromTeams(teams: LobbyTeamView[]): TournamentParticipantRow[] {
  return teams.flatMap((team) =>
    (team.members ?? []).map((member) => ({
      userId: member.userId,
      displayName: member.displayName ?? "Player",
      teamId: team.id,
      teamName: team.name,
      role: member.role,
      image: member.image ?? null,
      profileSlug: null,
      profileUrl: null,
      joinedAt: new Date().toISOString(),
      paidAt: null,
      gender: null,
      genderLabel: null,
      registrationStatus: null,
      paymentStatus: null,
      amountIdr: null,
    })),
  );
}

export function computeManageWorkspaceStats(input: {
  tournament: Pick<TournamentDetail, "format" | "tournamentType">;
  teams: LobbyTeamView[];
  reclubMatches: ReclubMatchView[];
  bracketMatches: BracketMatchView[];
  groupMatches?: GroupMatchView[];
  summary: TournamentRegistrationSummary;
}): TournamentSessionStats {
  if (input.tournament.format === "double_stage") {
    const statsTeams = input.teams
      .filter((t) => t.memberCount > 0)
      .map((t) => ({ id: t.id, name: t.name, memberCount: t.memberCount }));
    const groupMatches = (input.groupMatches ?? [])
      .map(toStatsMatchFromGroup)
      .filter((m): m is NonNullable<typeof m> => m != null);
    const bracketMatches = input.bracketMatches
      .map(toStatsMatchFromBracket)
      .filter((m): m is NonNullable<typeof m> => m != null);
    return computeTournamentSessionStats({
      matches: [...groupMatches, ...bracketMatches],
      teams: statsTeams,
      totalPlayers: input.summary.registeredPlayers,
    });
  }

  const isElimination = input.tournament.format !== "americano";
  const isOfficial = isOfficialType(input.tournament.tournamentType);

  if (isElimination && isOfficial) {
    return computeOfficialTournamentStats({
      matches: input.bracketMatches,
      leaderboard: [],
      participants: participantsFromTeams(input.teams),
      totalPlayers: input.summary.registeredPlayers,
      totalTeams: input.summary.registeredTeams,
    });
  }

  return computeReclubSessionStatsWithBracket({
    reclubMatches: input.reclubMatches,
    bracketMatches: input.bracketMatches,
    teams: input.teams,
    totalPlayers: input.summary.registeredPlayers,
    maxRounds: null,
  });
}
