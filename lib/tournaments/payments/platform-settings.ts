import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { platformSettings } from "@/db/schema/tournament-payments";

export const PLATFORM_PAYMENT_SETTINGS_KEY = "tournament_payment";

export type PlatformPaymentSettings = {
  /** Fixed platform fee per official registration (IDR) */
  platformFeeIdr: number;
  /** Optional processing fee percent added to invoice (e.g. 1.25) */
  processingFeePercent: number;
};

const DEFAULTS: PlatformPaymentSettings = {
  platformFeeIdr: 2000,
  processingFeePercent: 1.25,
};

export async function getPlatformPaymentSettings(): Promise<PlatformPaymentSettings> {
  const [row] = await getDb()
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, PLATFORM_PAYMENT_SETTINGS_KEY))
    .limit(1);

  if (!row?.value || typeof row.value !== "object") return DEFAULTS;

  const v = row.value as Partial<PlatformPaymentSettings>;
  return {
    platformFeeIdr:
      typeof v.platformFeeIdr === "number" && v.platformFeeIdr >= 0
        ? v.platformFeeIdr
        : DEFAULTS.platformFeeIdr,
    processingFeePercent:
      typeof v.processingFeePercent === "number" && v.processingFeePercent >= 0
        ? v.processingFeePercent
        : DEFAULTS.processingFeePercent,
  };
}

export async function updatePlatformPaymentSettings(
  value: PlatformPaymentSettings,
  updatedBy: string,
): Promise<PlatformPaymentSettings> {
  await getDb()
    .insert(platformSettings)
    .values({
      key: PLATFORM_PAYMENT_SETTINGS_KEY,
      value,
      updatedBy,
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedBy, updatedAt: new Date() },
    });

  return value;
}
