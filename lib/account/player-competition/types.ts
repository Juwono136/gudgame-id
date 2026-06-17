import type { MatchResultType } from "@/db/schema/player-competition";

export type PaginatedListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PlayerMatchListItem = {
  id: number;
  tournamentName: string;
  opponents: string;
  resultType: MatchResultType;
  score: string | null;
  round: string | null;
  playedAt: string;
};

export type PlayerTournamentListItem = {
  id: string;
  source: "official" | "recreational";
  tournamentId: number | null;
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
  registrationId?: number | null;
  registrationStatus?: string | null;
  registrationTeamName?: string | null;
  canEditRegistration?: boolean;
  canManageRegistration?: boolean;
};
