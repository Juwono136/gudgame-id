import type { MatchResultType } from "@/db/schema/player-competition";

export type PaginatedListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PlayerMatchListItem = {
  id: number; tournamentId: string | null;
  tournamentName: string;
  opponents: string;
  resultType: MatchResultType;
  score: string | null;
  round: string | null;
  playedAt: string;
  isOfficial: boolean;
  tournamentType: "official" | "fun_match";
  sportName: string | null;
  sportSlug: string | null;
  tournamentSlug: string | null;
  venue: string | null;
};

export type PlayerMatchSourceDetail = {
  /** bracket = knockout; group = round/group play (incl. Official group stage); fun_match = Fun Match rounds */
  kind: "bracket" | "group" | "fun_match";
  roundNumber: number | null;
  matchNumber: number | null;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  durationSeconds: number | null;
  summary: string | null;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type PlayerMatchDetail = PlayerMatchListItem & {
  userTeamName: string | null;
  statsTier: string | null;
  tournamentStatus: string | null;
  tournamentStartsAt: string | null;
  tournamentEndsAt: string | null;
  recordedAt: string;
  format: string | null;
  formatLabel: string | null;
  officialBilling: "paid" | "free" | null;
  categoryLabel: string | null;
  source: PlayerMatchSourceDetail | null;
  tournamentContext: {
    userWins: number;
    userLosses: number;
    userMatches: number;
    userWinRate: number | null;
    pointsEarned: number;
    placement: string | null;
  };
  careerSnapshot: {
    totalPoints: number;
    winRate: number | null;
    tier: string | null;
    tierLevel: string | null;
    totalMatches: number;
    wins: number;
    losses: number;
    worldRank: number | null;
  };
};

export type PlayerTournamentListItem = {
  id: string;
  source: "official" | "fun_match";
  tournamentId: string | null;
  year: number;
  tournamentName: string;
  category: string | null;
  placement: string;
  playedAt: string | null;
  sportSlug: string | null;
  slug: string | null;
  status: string | null;
  format: string | null;
  officialBilling: "paid" | "free" | null;
  venue: string | null;
  startsAt: string | null;
  endsAt: string | null;
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  registrationId?: string | null;
  registrationStatus?: string | null;
  registrationTeamName?: string | null;
  canEditRegistration?: boolean;
  canManageRegistration?: boolean;
};
