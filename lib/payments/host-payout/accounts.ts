import "server-only";

import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostBankAccounts } from "@/db/schema/host-bank-accounts";
import { hostXenditAccounts } from "@/db/schema/host-xendit";
import { user } from "@/db/schema/auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPayoutBankChannels } from "@/lib/payments/xendit/payout-channels";
import type {
  AddBankAccountInput,
  UpdateBankAccountInput,
} from "@/lib/payments/host-payout/schemas";
import type { HostBankAccountView, HostBankPayoutProfileView } from "@/lib/payments/host-payout/types";
import {
  PAYOUT_SCHEDULES,
  type PayoutSchedule,
  normalizePayoutSchedule,
} from "@/lib/payments/host-payout/constants";
import { isXenPlatformEnabled } from "@/lib/payments/xenplatform/config";
import { createManagedSubAccount } from "@/lib/payments/xenplatform/accounts";
import { verifyIndonesiaBankAccount } from "@/lib/payments/iluma/bank-name-validator";

const log = logger.child({ module: "host-bank-accounts" });

export const MAX_HOST_BANK_ACCOUNTS = 3;

function maskAccount(num: string): string {
  if (num.length <= 4) return num;
  return `•••• ${num.slice(-4)}`;
}

function toView(row: typeof hostBankAccounts.$inferSelect): HostBankAccountView {
  return {
    id: row.id,
    bankCode: row.bankCode,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountHolder: row.bankAccountHolder,
    maskedAccount: maskAccount(row.bankAccountNumber),
    label: row.label,
    isPrimary: row.isPrimary,
  };
}

function assertValidBankCode(code: string): void {
  // Placeholder — validated asynchronously against Xendit payout channels
  // in add/update functions so the list is always current and complete.
  if (!code?.trim()) {
    throw new AppError("Unsupported bank", { code: "VALIDATION_ERROR", statusCode: 422 });
  }
}

async function ensureHostProfile(userId: string) {
  const db = getDb();
  const [dbUser] = await db
    .select({ email: user.email, name: user.name, clubName: user.clubName })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser?.email) {
    throw new AppError("Account email is required.", { code: "VALIDATION_ERROR", statusCode: 400 });
  }

  const businessName = dbUser.clubName?.trim() || dbUser.name?.trim() || "Gud Game Host";
  const [existing] = await db
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  if (existing) return { existing, businessName, email: dbUser.email };

  const [created] = await db
    .insert(hostXenditAccounts)
    .values({
      userId,
      accountEmail: dbUser.email,
      businessName,
      status: "pending",
    })
    .returning();

  return { existing: created, businessName, email: dbUser.email };
}

async function maybeLinkXenPlatform(userId: string, businessName: string, email: string) {
  if (!isXenPlatformEnabled()) return;

  const db = getDb();
  const [row] = await db
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  if (row?.xenditAccountId) return;

  try {
    const created = await createManagedSubAccount({ email, businessName });
    await db
      .update(hostXenditAccounts)
      .set({
        xenditAccountId: created.id,
        status: created.status.toUpperCase() === "ACTIVE" ? "active" : "pending",
      })
      .where(eq(hostXenditAccounts.userId, userId));
  } catch (error) {
    log.warn("XenPlatform sub-account optional link failed", { userId, error });
  }
}

async function listAccounts(userId: string) {
  try {
    return await getDb()
      .select()
      .from(hostBankAccounts)
      .where(eq(hostBankAccounts.userId, userId))
      .orderBy(asc(hostBankAccounts.isPrimary), asc(hostBankAccounts.createdAt));
  } catch (e) {
    // Common in dev when migration 0003 hasn't been applied yet.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("host_bank_accounts") && msg.toLowerCase().includes("does not exist")) {
      return null;
    }
    throw e;
  }
}

function throwMigrationRequired(): never {
  throw new AppError(
    "Bank accounts storage is not initialized. Run DB migration 0003_host_bank_accounts.sql.",
    { code: "SERVICE_UNAVAILABLE", statusCode: 503 },
  );
}

function isMissingBankAccountsTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return lower.includes("host_bank_accounts") && lower.includes("does not exist");
}

export async function getHostBankPayoutProfile(userId: string): Promise<HostBankPayoutProfileView> {
  const [profile] = await getDb()
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  const accounts = await listAccounts(userId);
  if (accounts === null) {
    // Fallback to legacy single-bank fields from host_xendit_accounts
    const legacyConfigured = Boolean(profile?.bankAccountNumber && profile?.bankCode);
    const legacyViews: HostBankAccountView[] = legacyConfigured
      ? [
          {
            id: "legacy",
            bankCode: profile!.bankCode ?? "",
            bankAccountNumber: profile!.bankAccountNumber ?? "",
            bankAccountHolder: profile!.bankAccountHolder ?? "",
            maskedAccount: maskAccount(profile!.bankAccountNumber ?? ""),
            label: null,
            isPrimary: true,
          },
        ]
      : [];

    return {
      configured: legacyViews.length > 0,
      accounts: legacyViews,
      maxAccounts: MAX_HOST_BANK_ACCOUNTS,
      payoutSchedule: normalizePayoutSchedule(profile?.payoutSchedule),
      status: profile?.status ?? (legacyViews.length > 0 ? "active" : null),
      xenPlatformLinked: Boolean(profile?.xenditAccountId),
      businessName: profile?.businessName ?? null,
      migrationRequired: true,
    };
  }

  const views = accounts.map(toView);

  return {
    configured: views.length > 0,
    accounts: views,
    maxAccounts: MAX_HOST_BANK_ACCOUNTS,
    payoutSchedule: normalizePayoutSchedule(profile?.payoutSchedule),
    status: profile?.status ?? (views.length > 0 ? "active" : null),
    xenPlatformLinked: Boolean(profile?.xenditAccountId),
    businessName: profile?.businessName ?? null,
  };
}

export async function addHostBankAccount(
  userId: string,
  input: AddBankAccountInput,
): Promise<HostBankPayoutProfileView> {
  assertValidBankCode(input.bankCode);
  const db = getDb();

  // Always validate bank code against the live payout channels list (complete & official).
  const payoutBanks = await getPayoutBankChannels();
  if (!payoutBanks.some((b) => b.code === input.bankCode)) {
    throw new AppError("Unsupported bank", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const existingAccounts = await listAccounts(userId);
  if (existingAccounts === null) throwMigrationRequired();

  if (existingAccounts.length >= MAX_HOST_BANK_ACCOUNTS) {
    throw new AppError(`You can save up to ${MAX_HOST_BANK_ACCOUNTS} bank accounts.`, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const normalizedNumber = input.bankAccountNumber.replace(/\D/g, "");

  // Professional verification (if Iluma is configured). This prevents wrong payouts.
  // If not configured, we still allow saving but bank code still comes from an official list.
  if (process.env.ILUMA_API_KEY?.trim()) {
    const v = await verifyIndonesiaBankAccount({
      bankCode: input.bankCode,
      accountNumber: normalizedNumber,
      accountHolder: input.bankAccountHolder,
    });
    if (!v.ok) {
      throw new AppError(`Bank account verification failed: ${v.reason}`, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
  }
  const [duplicate] = await db
    .select({ id: hostBankAccounts.id })
    .from(hostBankAccounts)
    .where(
      and(
        eq(hostBankAccounts.userId, userId),
        eq(hostBankAccounts.bankAccountNumber, normalizedNumber),
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new AppError("This account number is already saved.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const { businessName, email } = await ensureHostProfile(userId);
  const isFirst = existingAccounts.length === 0;

  await db.insert(hostBankAccounts).values({
    id: crypto.randomUUID(),
    userId,
    bankCode: input.bankCode,
    bankAccountNumber: normalizedNumber,
    bankAccountHolder: input.bankAccountHolder.toUpperCase(),
    label: input.label?.trim() || null,
    isPrimary: isFirst,
  });

  if (isFirst) {
    await db
      .update(hostXenditAccounts)
      .set({ status: "active" })
      .where(eq(hostXenditAccounts.userId, userId));
  }

  await maybeLinkXenPlatform(userId, businessName, email);
  log.info("Host bank account added", { userId, bankCode: input.bankCode, isPrimary: isFirst });

  return getHostBankPayoutProfile(userId);
}

export async function updateHostBankAccount(
  userId: string,
  input: UpdateBankAccountInput,
): Promise<HostBankPayoutProfileView> {
  assertValidBankCode(input.bankCode);
  const db = getDb();
  const normalizedNumber = input.bankAccountNumber.replace(/\D/g, "");

  const payoutBanks = await getPayoutBankChannels();
  if (!payoutBanks.some((b) => b.code === input.bankCode)) {
    throw new AppError("Unsupported bank", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  let account: typeof hostBankAccounts.$inferSelect | undefined;
  try {
    [account] = await db
      .select()
      .from(hostBankAccounts)
      .where(and(eq(hostBankAccounts.id, input.id), eq(hostBankAccounts.userId, userId)))
      .limit(1);
  } catch (e) {
    if (isMissingBankAccountsTableError(e)) throwMigrationRequired();
    throw e;
  }

  if (!account) {
    throw new AppError("Bank account not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (process.env.ILUMA_API_KEY?.trim()) {
    const v = await verifyIndonesiaBankAccount({
      bankCode: input.bankCode,
      accountNumber: normalizedNumber,
      accountHolder: input.bankAccountHolder,
    });
    if (!v.ok) {
      throw new AppError(`Bank account verification failed: ${v.reason}`, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
  }

  const [duplicate] = await db
    .select({ id: hostBankAccounts.id })
    .from(hostBankAccounts)
    .where(
      and(
        eq(hostBankAccounts.userId, userId),
        eq(hostBankAccounts.bankAccountNumber, normalizedNumber),
        ne(hostBankAccounts.id, input.id),
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new AppError("This account number is already saved.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  await db
    .update(hostBankAccounts)
    .set({
      bankCode: input.bankCode,
      bankAccountNumber: normalizedNumber,
      bankAccountHolder: input.bankAccountHolder.toUpperCase(),
      label: input.label?.trim() || null,
    })
    .where(eq(hostBankAccounts.id, input.id));

  return getHostBankPayoutProfile(userId);
}

export async function deleteHostBankAccount(
  userId: string,
  accountId: string,
): Promise<HostBankPayoutProfileView> {
  const db = getDb();
  let account: typeof hostBankAccounts.$inferSelect | undefined;
  try {
    [account] = await db
      .select()
      .from(hostBankAccounts)
      .where(and(eq(hostBankAccounts.id, accountId), eq(hostBankAccounts.userId, userId)))
      .limit(1);
  } catch (e) {
    if (isMissingBankAccountsTableError(e)) throwMigrationRequired();
    throw e;
  }

  if (!account) {
    throw new AppError("Bank account not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await db.delete(hostBankAccounts).where(eq(hostBankAccounts.id, accountId));

  if (account.isPrimary) {
    const [next] = await db
      .select()
      .from(hostBankAccounts)
      .where(eq(hostBankAccounts.userId, userId))
      .orderBy(asc(hostBankAccounts.createdAt))
      .limit(1);

    if (next) {
      await db
        .update(hostBankAccounts)
        .set({ isPrimary: true })
        .where(eq(hostBankAccounts.id, next.id));
    } else {
      await db
        .update(hostXenditAccounts)
        .set({ status: "pending" })
        .where(eq(hostXenditAccounts.userId, userId));
    }
  }

  return getHostBankPayoutProfile(userId);
}

export async function setPrimaryHostBankAccount(
  userId: string,
  accountId: string,
): Promise<HostBankPayoutProfileView> {
  const db = getDb();
  let account: typeof hostBankAccounts.$inferSelect | undefined;
  try {
    [account] = await db
      .select()
      .from(hostBankAccounts)
      .where(and(eq(hostBankAccounts.id, accountId), eq(hostBankAccounts.userId, userId)))
      .limit(1);
  } catch (e) {
    if (isMissingBankAccountsTableError(e)) throwMigrationRequired();
    throw e;
  }

  if (!account) {
    throw new AppError("Bank account not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await db
    .update(hostBankAccounts)
    .set({ isPrimary: false })
    .where(eq(hostBankAccounts.userId, userId));

  await db
    .update(hostBankAccounts)
    .set({ isPrimary: true })
    .where(eq(hostBankAccounts.id, accountId));

  return getHostBankPayoutProfile(userId);
}

export async function updateHostPayoutSchedule(
  userId: string,
  payoutSchedule: PayoutSchedule,
): Promise<HostBankPayoutProfileView> {
  if (!PAYOUT_SCHEDULES.includes(payoutSchedule)) {
    throw new AppError("Invalid payout schedule", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const { existing } = await ensureHostProfile(userId);
  const current = normalizePayoutSchedule(existing.payoutSchedule);

  const profile = await getHostBankPayoutProfile(userId);
  if (!profile.configured) {
    throw new AppError("Add a payout bank account before setting a schedule.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  if (current === payoutSchedule) {
    return profile;
  }

  const [updated] = await getDb()
    .update(hostXenditAccounts)
    .set({ payoutSchedule, updatedAt: new Date() })
    .where(eq(hostXenditAccounts.userId, userId))
    .returning({ id: hostXenditAccounts.id });

  if (!updated) {
    throw new AppError("Could not update payout schedule", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  log.info("Host payout schedule updated", { userId, payoutSchedule, previous: current });

  return getHostBankPayoutProfile(userId);
}

/** @deprecated Use getHostBankPayoutProfile — kept for XenPlatform service compatibility */
export async function getPrimaryBankAccount(userId: string) {
  const [row] = await getDb()
    .select()
    .from(hostBankAccounts)
    .where(and(eq(hostBankAccounts.userId, userId), eq(hostBankAccounts.isPrimary, true)))
    .limit(1);

  return row ?? null;
}
