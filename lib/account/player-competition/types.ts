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
  id: number;
  year: number;
  tournamentName: string;
  category: string | null;
  placement: string;
  playedAt: string | null;
};
