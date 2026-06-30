import "server-only";

import { and, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  hostPayoutDisbursementItems,
  hostPayoutDisbursements,
} from "@/db/schema/host-payout-disbursements";
import { hostBankAccounts } from "@/db/schema/host-bank-accounts";
import { hostXenditAccounts } from "@/db/schema/host-xendit";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { sports } from "@/db/schema/sports";
import {
  BLOCKING_DISBURSEMENT_STATUSES,
} from "@/lib/payments/host-payout/disbursement/constants";
import type {
  HostPayoutDisbursementView,
  PendingEarningsBySport,
  PendingHostPaymentRow,
} from "@/lib/payments/host-payout/disbursement/types";
import {
  normalizePayoutSchedule,
  type PayoutSchedule,
} from "@/lib/payments/host-payout/constants";

function toView(
  row: typeof hostPayoutDisbursements.$inferSelect,
  sportNames: string[] = [],
): HostPayoutDisbursementView {
  return {
    id: row.id,
    amountIdr: row.amountIdr,
    paymentCount: row.paymentCount,
    payoutSchedule: normalizePayoutSchedule(row.payoutSchedule),
    bankCode: row.bankCode,
    maskedAccount: row.maskedAccount,
    bankAccountHolder: row.bankAccountHolder,
    status: row.status,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    estimatedArrivalAt: row.estimatedArrivalAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    sportNames,
  };
}

async function getSportNamesByDisbursementIds(
  disbursementIds: string[],
): Promise<Map<string, string[]>> {
  if (disbursementIds.length === 0) return new Map();

  const rows = await getDb()
    .select({
      disbursementId: hostPayoutDisbursementItems.disbursementId,
      sportName: sports.name,
    })
    .from(hostPayoutDisbursementItems)
    .innerJoin(
      tournamentPayments,
      eq(hostPayoutDisbursementItems.tournamentPaymentId, tournamentPayments.id),
    )
    .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(inArray(hostPayoutDisbursementItems.disbursementId, disbursementIds));

  const grouped = new Map<string, Set<string>>();
  for (const row of rows) {
    const current = grouped.get(row.disbursementId) ?? new Set<string>();
    current.add(row.sportName);
    grouped.set(row.disbursementId, current);
  }

  return new Map(
    [...grouped.entries()].map(([id, names]) => [id, [...names].sort((a, b) => a.localeCompare(b))]),
  );
}

export function aggregatePendingEarningsBySport(
  rows: PendingHostPaymentRow[],
): PendingEarningsBySport[] {
  const bySport = new Map<string, PendingEarningsBySport>();

  for (const row of rows) {
    const existing = bySport.get(row.sportSlug);
    if (existing) {
      existing.amountIdr += row.hostPayoutIdr;
      existing.paymentCount += 1;
      continue;
    }
    bySport.set(row.sportSlug, {
      sportSlug: row.sportSlug,
      sportName: row.sportName,
      amountIdr: row.hostPayoutIdr,
      paymentCount: 1,
    });
  }

  return [...bySport.values()].sort((a, b) => a.sportName.localeCompare(b.sportName));
}

export async function listPendingHostPayments(
  hostUserId: string,
): Promise<PendingHostPaymentRow[]> {
  const blockedRows = await getDb()
    .select({ paymentId: hostPayoutDisbursementItems.tournamentPaymentId })
    .from(hostPayoutDisbursementItems)
    .innerJoin(
      hostPayoutDisbursements,
      eq(hostPayoutDisbursementItems.disbursementId, hostPayoutDisbursements.id),
    )
    .where(
      and(
        eq(hostPayoutDisbursements.hostUserId, hostUserId),
        inArray(hostPayoutDisbursements.status, [...BLOCKING_DISBURSEMENT_STATUSES]),
      ),
    );

  const blockedIds = blockedRows.map((r) => r.paymentId);

  const conditions = [
    eq(tournaments.createdBy, hostUserId),
    eq(tournamentPayments.status, "paid"),
    eq(tournamentPayments.hostPayoutStatus, "completed"),
    sql`${tournamentPayments.hostPayoutIdr} > 0`,
  ];

  if (blockedIds.length > 0) {
    conditions.push(notInArray(tournamentPayments.id, blockedIds));
  }

  const rows = await getDb()
    .select({
      paymentId: tournamentPayments.id,
      tournamentId: tournamentPayments.tournamentId,
      sportSlug: sports.slug,
      sportName: sports.name,
      hostPayoutIdr: tournamentPayments.hostPayoutIdr,
      paidAt: tournamentPayments.paidAt,
      createdAt: tournamentPayments.createdAt,
    })
    .from(tournamentPayments)
    .innerJoin(tournaments, eq(tournamentPayments.tournamentId, tournaments.id))
    .innerJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(...conditions))
    .orderBy(tournamentPayments.paidAt);

  return rows;
}

export async function getLastCompletedDisbursement(hostUserId: string) {
  const [row] = await getDb()
    .select()
    .from(hostPayoutDisbursements)
    .where(
      and(
        eq(hostPayoutDisbursements.hostUserId, hostUserId),
        eq(hostPayoutDisbursements.status, "succeeded"),
      ),
    )
    .orderBy(desc(hostPayoutDisbursements.completedAt))
    .limit(1);

  return row ?? null;
}

export async function listHostDisbursements(
  hostUserId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: HostPayoutDisbursementView[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);

  const [items, [totalRow]] = await Promise.all([
    getDb()
      .select()
      .from(hostPayoutDisbursements)
      .where(eq(hostPayoutDisbursements.hostUserId, hostUserId))
      .orderBy(desc(hostPayoutDisbursements.createdAt))
      .limit(limit)
      .offset(offset),
    getDb()
      .select({ total: count() })
      .from(hostPayoutDisbursements)
      .where(eq(hostPayoutDisbursements.hostUserId, hostUserId)),
  ]);

  const sportMap = await getSportNamesByDisbursementIds(items.map((item) => item.id));

  return {
    items: items.map((item) => toView(item, sportMap.get(item.id) ?? [])),
    total: Number(totalRow?.total ?? 0),
  };
}

export async function getDisbursementByIdForHost(
  hostUserId: string,
  disbursementId: string,
): Promise<HostPayoutDisbursementView | null> {
  const [row] = await getDb()
    .select()
    .from(hostPayoutDisbursements)
    .where(
      and(
        eq(hostPayoutDisbursements.id, disbursementId),
        eq(hostPayoutDisbursements.hostUserId, hostUserId),
      ),
    )
    .limit(1);

  return row ? toView(row) : null;
}

export async function getDisbursementByReferenceId(referenceId: string) {
  const [row] = await getDb()
    .select()
    .from(hostPayoutDisbursements)
    .where(eq(hostPayoutDisbursements.referenceId, referenceId))
    .limit(1);

  return row ?? null;
}

export async function getDisbursementByXenditPayoutId(xenditPayoutId: string) {
  const [row] = await getDb()
    .select()
    .from(hostPayoutDisbursements)
    .where(eq(hostPayoutDisbursements.xenditPayoutId, xenditPayoutId))
    .limit(1);

  return row ?? null;
}

export type HostPayoutCandidate = {
  hostUserId: string;
  payoutSchedule: PayoutSchedule;
  xenditAccountId: string;
  primaryBank: {
    bankCode: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    maskedAccount: string;
  };
};

export async function listHostPayoutCandidates(): Promise<HostPayoutCandidate[]> {
  const hosts = await getDb()
    .select({
      hostUserId: hostXenditAccounts.userId,
      payoutSchedule: hostXenditAccounts.payoutSchedule,
      xenditAccountId: hostXenditAccounts.xenditAccountId,
      status: hostXenditAccounts.status,
    })
    .from(hostXenditAccounts)
    .where(
      and(
        eq(hostXenditAccounts.status, "active"),
        sql`${hostXenditAccounts.xenditAccountId} IS NOT NULL`,
      ),
    );

  const results: HostPayoutCandidate[] = [];

  for (const host of hosts) {
    if (!host.xenditAccountId) continue;

    const [primary] = await getDb()
      .select()
      .from(hostBankAccounts)
      .where(
        and(
          eq(hostBankAccounts.userId, host.hostUserId),
          eq(hostBankAccounts.isPrimary, true),
        ),
      )
      .limit(1);

    if (!primary) continue;

    results.push({
      hostUserId: host.hostUserId,
      payoutSchedule: normalizePayoutSchedule(host.payoutSchedule),
      xenditAccountId: host.xenditAccountId,
      primaryBank: {
        bankCode: primary.bankCode,
        bankAccountNumber: primary.bankAccountNumber,
        bankAccountHolder: primary.bankAccountHolder,
        maskedAccount:
          primary.bankAccountNumber.length <= 4
            ? primary.bankAccountNumber
            : `•••• ${primary.bankAccountNumber.slice(-4)}`,
      },
    });
  }

  return results;
}

export async function releaseDisbursementItems(disbursementId: string): Promise<void> {
  await getDb()
    .delete(hostPayoutDisbursementItems)
    .where(eq(hostPayoutDisbursementItems.disbursementId, disbursementId));
}

export async function hasActiveDisbursementForReference(referenceId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: hostPayoutDisbursements.id })
    .from(hostPayoutDisbursements)
    .where(
      and(
        eq(hostPayoutDisbursements.referenceId, referenceId),
        notInArray(hostPayoutDisbursements.status, ["failed", "cancelled", "reversed"]),
      ),
    )
    .limit(1);

  return Boolean(row);
}
