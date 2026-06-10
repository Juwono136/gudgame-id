import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";

export type PlayerPaymentHistoryItem = {
  id: number;
  tournamentId: number;
  tournamentName: string;
  sportSlug: string;
  tournamentSlug: string;
  amountIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  status: string;
  invoiceUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PlayerRegistrationItem = {
  registrationId: number;
  tournamentId: number;
  tournamentName: string;
  sportSlug: string;
  tournamentSlug: string;
  tournamentType: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  paymentStatus: string | null;
};

export async function listPlayerPayments(userId: string): Promise<PlayerPaymentHistoryItem[]> {
  const rows = await getDb()
    .select({
      id: tournamentPayments.id,
      tournamentId: tournamentPayments.tournamentId,
      tournamentName: tournaments.name,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
      amountIdr: tournamentPayments.amountIdr,
      platformFeeIdr: tournamentPayments.platformFeeIdr,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      status: tournamentPayments.status,
      invoiceUrl: tournamentPayments.invoiceUrl,
      paidAt: tournamentPayments.paidAt,
      createdAt: tournamentPayments.createdAt,
    })
    .from(tournamentPayments)
    .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(eq(tournamentPayments.payerUserId, userId))
    .orderBy(desc(tournamentPayments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    tournamentId: r.tournamentId,
    tournamentName: r.tournamentName,
    sportSlug: r.sportSlug,
    tournamentSlug: r.tournamentSlug,
    amountIdr: r.amountIdr,
    platformFeeIdr: r.platformFeeIdr,
    hostPayoutIdr: r.hostPayoutIdr,
    status: r.status,
    invoiceUrl: r.invoiceUrl,
    paidAt: r.paidAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listPlayerRegistrations(userId: string): Promise<PlayerRegistrationItem[]> {
  const rows = await getDb()
    .select({
      registrationId: tournamentRegistrations.id,
      tournamentId: tournamentRegistrations.tournamentId,
      tournamentName: tournaments.name,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
      tournamentType: tournaments.tournamentType,
      status: tournamentRegistrations.status,
      startsAt: tournaments.startsAt,
      endsAt: tournaments.endsAt,
      paymentStatus: tournamentPayments.status,
    })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(eq(tournamentRegistrations.registeredByUserId, userId))
    .orderBy(desc(tournamentRegistrations.createdAt));

  return rows.map((r) => ({
    registrationId: r.registrationId,
    tournamentId: r.tournamentId,
    tournamentName: r.tournamentName,
    sportSlug: r.sportSlug,
    tournamentSlug: r.tournamentSlug,
    tournamentType: r.tournamentType,
    status: r.status,
    startsAt: r.startsAt?.toISOString() ?? null,
    endsAt: r.endsAt?.toISOString() ?? null,
    paymentStatus: r.paymentStatus,
  }));
}
