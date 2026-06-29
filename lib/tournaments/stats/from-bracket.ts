import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { LeaderboardEntry } from "@/lib/tournaments/brackets/leaderboard";
import { computeTournamentSessionStats } from "@/lib/tournaments/stats/compute";
import type {
  StatsMatchInput,
  StatsTeamInput,
  TournamentPlayerStatRow,
  TournamentSessionStats,
} from "@/lib/tournaments/stats/types";
import type { TournamentParticipantRow } from "@/lib/tournaments/participants/query";

function toStatsMatch(match: BracketMatchView): StatsMatchInput | null {
  if (match.status === "bye" || !match.teamAName || !match.teamBName) return null;

  return {
    id: match.id,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    scoreA: match.scoreA ?? 0,
    scoreB: match.scoreB ?? 0,
    status: match.status,
    durationSeconds: null,
  };
}

function buildTeams(
  leaderboard: LeaderboardEntry[],
  participants: TournamentParticipantRow[],
  matches: BracketMatchView[],
): StatsTeamInput[] {
  const memberCounts = new Map<string, number>();
  for (const participant of participants) {
    memberCounts.set(participant.teamId, (memberCounts.get(participant.teamId) ?? 0) + 1);
  }

  const teamMap = new Map<string, StatsTeamInput>();

  for (const entry of leaderboard) {
    teamMap.set(entry.teamId, {
      id: entry.teamId,
      name: entry.teamName,
      memberCount: memberCounts.get(entry.teamId) ?? 0,
    });
  }

  for (const match of matches) {
    if (match.teamAId && match.teamAName && !teamMap.has(match.teamAId)) {
      teamMap.set(match.teamAId, {
        id: match.teamAId,
        name: match.teamAName,
        memberCount: memberCounts.get(match.teamAId) ?? 0,
      });
    }
    if (match.teamBId && match.teamBName && !teamMap.has(match.teamBId)) {
      teamMap.set(match.teamBId, {
        id: match.teamBId,
        name: match.teamBName,
        memberCount: memberCounts.get(match.teamBId) ?? 0,
      });
    }
  }

  for (const participant of participants) {
    if (!teamMap.has(participant.teamId)) {
      teamMap.set(participant.teamId, {
        id: participant.teamId,
        name: participant.teamName,
        memberCount: memberCounts.get(participant.teamId) ?? 0,
      });
    }
  }

  return [...teamMap.values()];
}

function buildPlayers(
  participants: TournamentParticipantRow[],
  stats: TournamentSessionStats,
): TournamentPlayerStatRow[] {
  const teamById = new Map(
    stats.teams.filter((t) => t.teamId).map((t) => [t.teamId!, t]),
  );
  const teamByName = new Map(stats.teams.map((t) => [t.name, t]));

  return participants.map((participant) => {
    const teamStat =
      teamById.get(participant.teamId) ?? teamByName.get(participant.teamName);

    return {
      userId: participant.userId,
      displayName: participant.displayName,
      teamName: participant.teamName,
      teamWins: teamStat?.wins ?? 0,
      teamLosses: teamStat?.losses ?? 0,
      teamPlayed: teamStat?.played ?? 0,
      teamPointsFor: teamStat?.pointsFor ?? 0,
      teamPointsAgainst: teamStat?.pointsAgainst ?? 0,
      profileUrl: participant.profileUrl,
      image: participant.image,
    };
  });
}

export function computeOfficialTournamentStats(input: {
  matches: BracketMatchView[];
  leaderboard: LeaderboardEntry[];
  participants: TournamentParticipantRow[];
  totalPlayers: number;
  totalTeams: number;
}): TournamentSessionStats {
  const teams = buildTeams(input.leaderboard, input.participants, input.matches);
  const matches = input.matches
    .map(toStatsMatch)
    .filter((m): m is StatsMatchInput => m != null);

  const activeTeams =
    teams.filter((t) => t.memberCount > 0).length || input.totalTeams;

  const base = computeTournamentSessionStats({
    matches,
    teams,
    totalPlayers: input.totalPlayers,
    dedupeKey: (match) => match.id,
  });

  return {
    ...base,
    activeTeams: activeTeams || base.activeTeams,
    players: buildPlayers(input.participants, base),
  };
}
