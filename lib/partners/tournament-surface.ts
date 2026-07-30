import type { TournamentDetail } from "@/lib/tournaments/service";

/**
 * Partner white-label events keep fun_match format/scoring engines.
 * Billing (paid/free entry) is allowed for guest registration — only coerce type.
 */
export function toPartnerFunMatchTournament(
  tournament: TournamentDetail,
): TournamentDetail {
  if (tournament.tournamentType === "fun_match") {
    return tournament;
  }

  return {
    ...tournament,
    tournamentType: "fun_match",
  };
}
