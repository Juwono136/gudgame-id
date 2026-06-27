import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { OfficialBillingType } from "@/db/schema/tournaments";
import {
  tournamentRegistrations,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";

export function isFreeOfficialBilling(
  officialBilling: OfficialBillingType | string | null | undefined,
): boolean {
  return officialBilling === "free";
}

/** Confirmed official team ids visible on public roster / participants list. */
export async function listConfirmedOfficialTeamIds(
  tournamentId: string,
  officialBilling: OfficialBillingType | string | null | undefined,
): Promise<Set<string>> {
  const db = getDb();

  if (isFreeOfficialBilling(officialBilling)) {
    const rows = await db
      .select({ teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, "confirmed"),
        ),
      );

    return new Set(rows.map((r) => r.teamId).filter((id): id is string => id != null));
  }

  const rows = await db
    .select({ teamId: tournamentRegistrations.teamId })
    .from(tournamentRegistrations)
    .innerJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
        eq(tournamentPayments.status, "paid"),
      ),
    );

  return new Set(rows.map((r) => r.teamId).filter((id): id is string => id != null));
}
