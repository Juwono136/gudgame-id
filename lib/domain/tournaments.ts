/** Client-safe tournament domain types and constants. */

export type TournamentId = string;
export type RegistrationId = string;
export type TournamentPaymentId = string;
export type TournamentTeamId = string;
export type TournamentMatchId = string;

export {
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
  TOURNAMENT_FORMATS,
  type TournamentStatus,
  type TournamentType,
  type TournamentFormat,
  type Tournament,
  type NewTournament,
} from "@/db/schema/tournaments";
