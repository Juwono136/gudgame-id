import type { PlatformPaymentSettings } from "@/lib/tournaments/payments/platform-settings";

export type PaymentSplit = {
  registrationFeeIdr: number;
  processingFeeIdr: number;
  platformFeeIdr: number;
  hostPayoutIdr: number;
  totalChargeIdr: number;
};

export function calculateOfficialPaymentSplit(
  registrationFeeIdr: number,
  settings: PlatformPaymentSettings,
): PaymentSplit {
  const fee = Math.max(0, registrationFeeIdr);
  const platformFeeIdr = Math.min(settings.platformFeeIdr, fee);
  const processingFeeIdr = Math.round((fee * settings.processingFeePercent) / 100);
  const hostPayoutIdr = Math.max(0, fee - platformFeeIdr);
  const totalChargeIdr = fee + processingFeeIdr;

  return {
    registrationFeeIdr: fee,
    processingFeeIdr,
    platformFeeIdr,
    hostPayoutIdr,
    totalChargeIdr,
  };
}
