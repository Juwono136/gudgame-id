import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostXenditAccounts, type HostXenditAccount } from "@/db/schema/host-xendit";
import { user } from "@/db/schema/auth";
import { AppError } from "@/lib/errors";
import { createManagedSubAccount, getManagedSubAccount } from "@/lib/payments/xenplatform/accounts";
import { isXenPlatformEnabled } from "@/lib/payments/xenplatform/config";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "xenplatform-host-account" });

export type HostPayoutProfile = {
  configured: boolean;
  status: HostXenditAccount["status"] | null;
  xenditAccountId: string | null;
  businessName: string | null;
  xenPlatformEnabled: boolean;
};

function normalizeAccountStatus(xenditStatus: string): HostXenditAccount["status"] {
  const upper = xenditStatus.toUpperCase();
  if (upper === "ACTIVE" || upper === "LIVE") return "active";
  if (upper === "SUSPENDED") return "suspended";
  if (upper === "FAILED") return "failed";
  return "pending";
}

export async function getHostPayoutProfile(userId: string): Promise<HostPayoutProfile> {
  const xenPlatformEnabled = isXenPlatformEnabled();
  const [row] = await getDb()
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  if (!row) {
    return {
      configured: false,
      status: null,
      xenditAccountId: null,
      businessName: null,
      xenPlatformEnabled,
    };
  }

  return {
    configured: row.status === "active",
    status: row.status,
    xenditAccountId: row.xenditAccountId,
    businessName: row.businessName,
    xenPlatformEnabled,
  };
}

export async function getActiveHostXenditAccount(
  userId: string,
): Promise<HostXenditAccount | null> {
  const [row] = await getDb()
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  if (!row || row.status !== "active" || !row.xenditAccountId) return null;
  return row;
}

export async function setupHostXenditAccount(userId: string): Promise<HostPayoutProfile> {
  if (!isXenPlatformEnabled()) {
    throw new AppError("XenPlatform payouts are not enabled on this environment.", {
      code: "PAYMENT_NOT_CONFIGURED",
      statusCode: 503,
    });
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  if (existing?.status === "active") {
    return getHostPayoutProfile(userId);
  }

  const [dbUser] = await db
    .select({ email: user.email, name: user.name, clubName: user.clubName })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser?.email) {
    throw new AppError("Account email is required to set up payouts.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const businessName = dbUser.clubName?.trim() || dbUser.name?.trim() || "Gud Game Host";

  try {
    let xenditAccountId = existing?.xenditAccountId;
    let remoteStatus = "PENDING";

    if (xenditAccountId) {
      const remote = await getManagedSubAccount(xenditAccountId);
      remoteStatus = remote.status;
    } else {
      const created = await createManagedSubAccount({
        email: dbUser.email,
        businessName,
      });
      xenditAccountId = created.id;
      remoteStatus = created.status;
    }

    const status = normalizeAccountStatus(remoteStatus);

    if (existing) {
      await db
        .update(hostXenditAccounts)
        .set({
          xenditAccountId,
          accountEmail: dbUser.email,
          businessName,
          status,
          metadata: { lastRemoteStatus: remoteStatus },
        })
        .where(eq(hostXenditAccounts.id, existing.id));
    } else {
      await db.insert(hostXenditAccounts).values({
        userId,
        xenditAccountId,
        accountEmail: dbUser.email,
        businessName,
        status,
        metadata: { lastRemoteStatus: remoteStatus },
      });
    }

    log.info("Host XenPlatform account provisioned", { userId, xenditAccountId, status });

    return getHostPayoutProfile(userId);
  } catch (error) {
    log.error("Host XenPlatform setup failed", { userId, error });

    if (existing) {
      await db
        .update(hostXenditAccounts)
        .set({ status: "failed" })
        .where(eq(hostXenditAccounts.id, existing.id));
    }

    throw error;
  }
}

export async function refreshHostXenditAccountStatus(userId: string): Promise<HostPayoutProfile> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(hostXenditAccounts)
    .where(eq(hostXenditAccounts.userId, userId))
    .limit(1);

  if (!row?.xenditAccountId) return getHostPayoutProfile(userId);

  try {
    const remote = await getManagedSubAccount(row.xenditAccountId);
    const status = normalizeAccountStatus(remote.status);
    await db
      .update(hostXenditAccounts)
      .set({
        status,
        metadata: { lastRemoteStatus: remote.status },
      })
      .where(eq(hostXenditAccounts.id, row.id));
  } catch (error) {
    log.warn("Could not refresh XenPlatform account status", { userId, error });
  }

  return getHostPayoutProfile(userId);
}
