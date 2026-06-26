import "server-only";

import { xenditRequest } from "@/lib/payments/xendit/client";

export type XenditPayoutChannel = {
  channel_code: string;
  channel_name: string;
  channel_category: string;
  currency?: string;
  is_available?: boolean;
  can_name_validate?: boolean;
};

export type PayoutBankChannel = {
  code: string;
  name: string;
  canNameValidate: boolean;
};

let cached:
  | { atMs: number; banks: PayoutBankChannel[] }
  | null = null;

const CACHE_MS = 1000 * 60 * 60 * 6; // 6h

export async function getPayoutBankChannels(): Promise<PayoutBankChannel[]> {
  const now = Date.now();
  if (cached && now - cached.atMs < CACHE_MS) return cached.banks;

  const channels = await xenditRequest<XenditPayoutChannel[]>({
    method: "GET",
    path: "/payouts_channels",
    operation: "get payout channels",
  });

  const banks = channels
    .filter((c) => (c.channel_category ?? "").toUpperCase() === "BANK")
    .filter((c) => c.is_available !== false)
    // Ensure Indonesia-only list in environments without Iluma:
    // Xendit payout channels can include multiple regions; filter by IDR.
    .filter((c) => !c.currency || c.currency.toUpperCase() === "IDR")
    .map((c) => ({
      code: c.channel_code,
      name: c.channel_name,
      canNameValidate: Boolean(c.can_name_validate),
    }))
    .filter((c) => Boolean(c.code) && Boolean(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  cached = { atMs: now, banks };
  return banks;
}

