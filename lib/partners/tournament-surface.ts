import type { TournamentDetail } from "@/lib/tournaments/service";

/**
 * Partner white-label events are community fun matches only.
 * Coerce any leftover official / billing fields so shared manage/public
 * shells never surface Official paid/free UI on partner surfaces.
 */
export function toPartnerFunMatchTournament(
  tournament: TournamentDetail,
): TournamentDetail {
  if (
    tournament.tournamentType === "fun_match" &&
    tournament.officialBilling == null &&
    (tournament.registrationFeeIdr == null || tournament.registrationFeeIdr === 0)
  ) {
    return tournament;
  }

  return {
    ...tournament,
    tournamentType: "fun_match",
    officialBilling: null,
    registrationFeeIdr: null,
  };
}
