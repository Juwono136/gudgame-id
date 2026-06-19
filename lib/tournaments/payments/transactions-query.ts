import "server-only";

import { and, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations, tournamentTeams } from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";

import type { PaymentTransactionRow, TransactionQueryResult } from "@/lib/tournaments/payments/transaction-types";

export type { PaymentTransactionRow, TransactionQueryResult };

export type TransactionQueryScope = "admin" | "host" | "player";

export type TransactionQueryOptions = {
  scope: TransactionQueryScope;
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  tournamentId?: string;
  dateFrom?: string;
  dateTo?: string;
};

const hostUser = alias(user, "host_user");

export async function queryPaymentTransactions(
  options: TransactionQueryOptions,
): Promise<TransactionQueryResult> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const search = options.search?.trim();

  const conditions = [];

  if (options.scope === "host") {
    conditions.push(eq(tournaments.createdBy, options.userId));
  } else if (options.scope === "player") {
    conditions.push(eq(tournamentPayments.payerUserId, options.userId));
  }

  if (options.status && options.status !== "all") {
    conditions.push(eq(tournamentPayments.status, options.status));
  }

  if (options.tournamentId) {
    conditions.push(eq(tournamentPayments.tournamentId, options.tournamentId));
  }

  if (options.dateFrom) {
    conditions.push(gte(tournamentPayments.createdAt, new Date(options.dateFrom)));
  }

  if (options.dateTo) {
    conditions.push(lte(tournamentPayments.createdAt, new Date(options.dateTo)));
  }

  if (search) {
    conditions.push(
      or(
        ilike(tournaments.name, `%${search}%`),
        ilike(tournamentTeams.name, `%${search}%`),
        ilike(tournamentPayments.xenditExternalId, `%${search}%`),
        ilike(user.name, `%${search}%`),
        ilike(hostUser.name, `%${search}%`),
      )!,
    );
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseQuery = getDb()
    .select({
      paymentId: tournamentPayments.id,
      registrationId: tournamentPayments.registrationId,
      tournamentId: tournamentPayments.tournamentId,
      tournamentName: tournaments.name,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
      tournamentType: tournaments.tournamentType,
      teamName: tournamentTeams.name,
      payerUserId: tournamentPayments.payerUserId,
      payerName: user.name,
      hostUserId: tournaments.createdBy,
      hostName: hostUser.name,
      amountIdr: tournamentPayments.amountIdr,
      platformFeeIdr: tournamentPayments.platformFeeIdr,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      processingFeeIdr: tournamentPayments.processingFeeIdr,
      status: tournamentPayments.status,
      hostPayoutStatus: tournamentPayments.hostPayoutStatus,
      metadata: tournamentPayments.metadata,
      xenditExternalId: tournamentPayments.xenditExternalId,
      paidAt: tournamentPayments.paidAt,
      createdAt: tournamentPayments.createdAt,
    })
    .from(tournamentPayments)
    .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .leftJoin(
      tournamentRegistrations,
      eq(tournamentPayments.registrationId, tournamentRegistrations.id),
    )
    .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .innerJoin(user, eq(tournamentPayments.payerUserId, user.id))
    .leftJoin(hostUser, eq(tournaments.createdBy, hostUser.id))
    .where(whereClause)
    .orderBy(desc(tournamentPayments.createdAt));

  const [rows, [totalRow], summaryRows] = await Promise.all([
    baseQuery.limit(limit).offset(offset),
    getDb()
      .select({ total: count() })
      .from(tournamentPayments)
      .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
      .leftJoin(
        tournamentRegistrations,
        eq(tournamentPayments.registrationId, tournamentRegistrations.id),
      )
      .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
      .innerJoin(user, eq(tournamentPayments.payerUserId, user.id))
      .leftJoin(hostUser, eq(tournaments.createdBy, hostUser.id))
      .where(whereClause),
    getDb()
      .select({
        status: tournamentPayments.status,
        amount: sql<number>`coalesce(sum(${tournamentPayments.amountIdr}), 0)::int`,
        platform: sql<number>`coalesce(sum(${tournamentPayments.platformFeeIdr}), 0)::int`,
        host: sql<number>`coalesce(sum(${tournamentPayments.hostPayoutIdr}), 0)::int`,
        cnt: count(),
      })
      .from(tournamentPayments)
      .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
      .leftJoin(
        tournamentRegistrations,
        eq(tournamentPayments.registrationId, tournamentRegistrations.id),
      )
      .leftJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
      .innerJoin(user, eq(tournamentPayments.payerUserId, user.id))
      .leftJoin(hostUser, eq(tournaments.createdBy, hostUser.id))
      .where(whereClause)
      .groupBy(tournamentPayments.status),
  ]);

  let totalCollectedIdr = 0;
  let totalPlatformFeesIdr = 0;
  let totalHostPayoutIdr = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let expiredCount = 0;
  let failedCount = 0;

  for (const row of summaryRows) {
    if (row.status === "paid") {
      totalCollectedIdr += Number(row.amount);
      totalPlatformFeesIdr += Number(row.platform);
      totalHostPayoutIdr += Number(row.host);
      paidCount += Number(row.cnt);
    }
    if (row.status === "pending") {
      pendingCount += Number(row.cnt);
    }
    if (row.status === "expired") {
      expiredCount += Number(row.cnt);
    }
    if (row.status === "failed") {
      failedCount += Number(row.cnt);
    }
  }

  const items: PaymentTransactionRow[] = rows.map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return {
      paymentId: r.paymentId,
      registrationId: r.registrationId,
      tournamentId: r.tournamentId,
      tournamentName: r.tournamentName,
      sportSlug: r.sportSlug,
      tournamentSlug: r.tournamentSlug,
      tournamentType: r.tournamentType,
      teamName: r.teamName,
      payerUserId: r.payerUserId,
      payerName: r.payerName,
      hostUserId: r.hostUserId,
      hostName: r.hostName,
      amountIdr: r.amountIdr,
      platformFeeIdr: r.platformFeeIdr,
      hostPayoutIdr: r.hostPayoutIdr,
      processingFeeIdr: r.processingFeeIdr,
      status: r.status,
      hostPayoutStatus: r.hostPayoutStatus,
      paymentMethod: typeof meta.paymentMethod === "string" ? meta.paymentMethod : null,
      xenditExternalId: r.xenditExternalId,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return {
    items,
    total: Number(totalRow?.total ?? 0),
    summary: {
      totalCollectedIdr,
      totalPlatformFeesIdr,
      totalHostPayoutIdr,
      paidCount,
      pendingCount,
      expiredCount,
      failedCount,
    },
  };
}
