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
  OFFICIAL_BILLING_TYPES,
  TOURNAMENT_CATEGORIES,
  type TournamentStatus,
  type TournamentType,
  type TournamentFormat,
  type OfficialBillingType,
  type TournamentCategory,
  type Tournament,
  type NewTournament,
} from "@/db/schema/tournaments";
