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
  tournamentType: "official" | "recreational";
  sportName: string | null;
  sportSlug: string | null;
  tournamentSlug: string | null;
  venue: string | null;
};

export type PlayerMatchSourceDetail = {
  kind: "reclub" | "bracket";
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
  tournamentStatus: string | null;
  tournamentStartsAt: string | null;
  tournamentEndsAt: string | null;
  recordedAt: string;
  source: PlayerMatchSourceDetail | null;
};

export type PlayerTournamentListItem = {
  id: string;
  source: "official" | "recreational";
  tournamentId: string | null;
  year: number;
  tournamentName: string;
  category: string | null;
  placement: string;
  playedAt: string | null;
  sportSlug: string | null;
  slug: string | null;
  status: string | null;
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  registrationId?: string | null;
  registrationStatus?: string | null;
  registrationTeamName?: string | null;
  canEditRegistration?: boolean;
  canManageRegistration?: boolean;
};
