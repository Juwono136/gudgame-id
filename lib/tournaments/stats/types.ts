export type TournamentTeamStatRow = {
  teamId: string | null;
  name: string;
  memberCount: number;
  wins: number;
  losses: number;
  draws: number;
  played: number;
  pointsFor: number;
  pointsAgainst: number;
  winRate: number;
};

export type TournamentPlayerStatRow = {
  userId: string;
  displayName: string;
  teamName: string;
  teamWins: number;
  teamLosses: number;
  teamPlayed: number;
  profileUrl?: string | null;
  image?: string | null;
};

export type TournamentSessionStats = {
  totalPlayers: number;
  activeTeams: number;
  completedMatches: number;
  inProgressMatches: number;
  avgDurationSeconds: number | null;
  teams: TournamentTeamStatRow[];
  players: TournamentPlayerStatRow[];
};

export type StatsMatchInput = {
  id: string;
  teamAName: string;
  teamBName: string;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  status: string;
  durationSeconds: number | null;
};

export type StatsTeamInput = {
  id: string;
  name: string;
  memberCount: number;
};
