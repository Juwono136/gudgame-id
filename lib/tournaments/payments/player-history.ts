import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";

export type PlayerPaymentHistoryItem = {
  id: string;
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  sportName: string;
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
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  sportSlug: string;
  sportName: string;
  tournamentSlug: string;
  tournamentType: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  paymentStatus: string | null;
};

const REGISTRATION_STATUS_RANK: Record<string, number> = {
  confirmed: 100,
  pending_payment: 80,
  awaiting_confirmation: 60,
  draft: 40,
  declined: 20,
  cancelled: 10,
};

function registrationItemRank(item: PlayerRegistrationItem): number {
  let rank = REGISTRATION_STATUS_RANK[item.status] ?? 0;
  if (item.paymentStatus === "paid") rank += 5;
  return rank;
}

/** One card per tournament — players may have multiple team registrations in the same event. */
export function dedupePlayerRegistrationsByTournament(
  items: PlayerRegistrationItem[],
): PlayerRegistrationItem[] {
  const byTournament = new Map<string, PlayerRegistrationItem>();

  for (const item of items) {
    const existing = byTournament.get(item.tournamentId);
    if (!existing) {
      byTournament.set(item.tournamentId, item);
      continue;
    }

    const itemRank = registrationItemRank(item);
    const existingRank = registrationItemRank(existing);
    if (
      itemRank > existingRank ||
      (itemRank === existingRank && item.registrationId > existing.registrationId)
    ) {
      byTournament.set(item.tournamentId, item);
    }
  }

  return [...byTournament.values()].sort((a, b) => {
    const aTime = a.startsAt ? Date.parse(a.startsAt) : 0;
    const bTime = b.startsAt ? Date.parse(b.startsAt) : 0;
    return bTime - aTime;
  });
}

export async function listPlayerPayments(userId: string): Promise<PlayerPaymentHistoryItem[]> {
  const rows = await getDb()
    .select({
      id: tournamentPayments.id,
      registrationId: tournamentPayments.registrationId,
      tournamentId: tournamentPayments.tournamentId,
      tournamentName: tournaments.name,
      sportSlug: sports.slug,
      sportName: sports.name,
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
    registrationId: r.registrationId,
    tournamentId: r.tournamentId,
    tournamentName: r.tournamentName,
    sportSlug: r.sportSlug,
    sportName: r.sportName,
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
  const registrationSelect = {
    registrationId: tournamentRegistrations.id,
    tournamentId: tournamentRegistrations.tournamentId,
    tournamentName: tournaments.name,
    sportSlug: sports.slug,
    sportName: sports.name,
    tournamentSlug: tournaments.slug,
    tournamentType: tournaments.tournamentType,
    status: tournamentRegistrations.status,
    startsAt: tournaments.startsAt,
    endsAt: tournaments.endsAt,
    paymentStatus: tournamentPayments.status,
  } as const;

  const mapRow = (r: {
    registrationId: string;
    tournamentId: string;
    tournamentName: string;
    sportSlug: string;
    sportName: string;
    tournamentSlug: string;
    tournamentType: string;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
    paymentStatus: string | null;
  }): PlayerRegistrationItem => ({
    registrationId: r.registrationId,
    tournamentId: r.tournamentId,
    tournamentName: r.tournamentName,
    sportSlug: r.sportSlug,
    sportName: r.sportName,
    tournamentSlug: r.tournamentSlug,
    tournamentType: r.tournamentType,
    status: r.status,
    startsAt: r.startsAt?.toISOString() ?? null,
    endsAt: r.endsAt?.toISOString() ?? null,
    paymentStatus: r.paymentStatus,
  });

  const directRows = await getDb()
    .select(registrationSelect)
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournamentRegistrations.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(eq(tournamentRegistrations.registeredByUserId, userId))
    .orderBy(desc(tournamentRegistrations.createdAt));

  const memberRows = await getDb()
    .select(registrationSelect)
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
    .innerJoin(tournaments, eq(tournamentTeams.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .innerJoin(
      tournamentRegistrations,
      and(
        eq(tournamentRegistrations.teamId, tournamentTeams.id),
        eq(tournamentRegistrations.tournamentId, tournaments.id),
      ),
    )
    .leftJoin(
      tournamentPayments,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .where(eq(tournamentTeamMembers.userId, userId))
    .orderBy(desc(tournamentRegistrations.createdAt));

  const merged = [...directRows, ...memberRows].map(mapRow);

  return dedupePlayerRegistrationsByTournament(merged);
}
