import { eq, isNull, type SQL } from "drizzle-orm";
import { tournaments } from "@/db/schema/tournaments";

/** Gud Game public/admin tournament queries — never include partner tenants. */
export function gudGameTournamentScope(): SQL {
  return isNull(tournaments.partnerId);
}

/** Partner-scoped tournament queries. */
export function partnerTournamentScope(partnerId: string): SQL {
  return eq(tournaments.partnerId, partnerId);
}

export function isPartnerTournament(tournament: {
  partnerId?: string | null;
}): boolean {
  return Boolean(tournament.partnerId);
}
