import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import { user } from "@/db/schema/auth";

export type HostPaymentRecord = {
  paymentId: string;
  registrationId: string | null;
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  tournamentSlug: string;
  teamName: string | null;
  payerName: string | null;
  amountIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  processingFeeIdr: number;
  status: string;
  hostPayoutStatus: string | null;
  paidAt: string | null;
  createdAt: string;
  invoiceExternalId: string | null;
};

export async function listHostTournamentPayments(
  hostUserId: string,
  options?: { tournamentId?: string },
): Promise<HostPaymentRecord[]> {
  const db = getDb();
  const hostTournaments = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.createdBy, hostUserId));

  const tournamentIds = hostTournaments.map((t) => t.id);
  if (!tournamentIds.length) return [];

  const filterIds = options?.tournamentId
    ? tournamentIds.filter((id) => id === options.tournamentId)
    : tournamentIds;
  if (!filterIds.length) return [];

  const rows = await db
    .select({
      paymentId: tournamentPayments.id,
      registrationId: tournamentPayments.registrationId,
      tournamentId: tournamentPayments.tournamentId,
      tournamentName: tournaments.name,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
      teamName: tournamentTeams.name,
      payerName: user.name,
      amountIdr: tournamentPayments.amountIdr,
      platformFeeIdr: tournamentPayments.platformFeeIdr,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      processingFeeIdr: tournamentPayments.processingFeeIdr,
      status: tournamentPayments.status,
      hostPayoutStatus: tournamentPayments.hostPayoutStatus,
      paidAt: tournamentPayments.paidAt,
      createdAt: tournamentPayments.createdAt,
      invoiceExternalId: tournamentPayments.xenditExternalId,
    })
    .from(tournamentPayments)
    .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(
      tournamentRegistrations,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .leftJoin(user, eq(tournamentPayments.payerUserId, user.id))
    .where(
      and(
        inArray(tournamentPayments.tournamentId, filterIds),
        inArray(tournamentPayments.status, ["pending", "paid", "expired", "failed"]),
      ),
    )
    .orderBy(desc(tournamentPayments.createdAt));

  return rows.map((r) => ({
    paymentId: r.paymentId,
    registrationId: r.registrationId,
    tournamentId: r.tournamentId,
    tournamentName: r.tournamentName,
    sportSlug: r.sportSlug,
    tournamentSlug: r.tournamentSlug,
    teamName: r.teamName,
    payerName: r.payerName,
    amountIdr: r.amountIdr,
    platformFeeIdr: r.platformFeeIdr,
    hostPayoutIdr: r.hostPayoutIdr,
    processingFeeIdr: r.processingFeeIdr,
    status: r.status,
    hostPayoutStatus: r.hostPayoutStatus,
    paidAt: r.paidAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    invoiceExternalId: r.invoiceExternalId,
  }));
}
