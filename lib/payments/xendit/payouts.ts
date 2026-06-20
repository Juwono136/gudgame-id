import "server-only";

import { xenditRequest } from "@/lib/payments/xendit/client";

export type XenditPayoutStatus =
  | "ACCEPTED"
  | "REQUESTED"
  | "FAILED"
  | "SUCCEEDED"
  | "CANCELLED"
  | "REVERSED";

export type CreateXenditPayoutInput = {
  referenceId: string;
  amountIdr: number;
  channelCode: string;
  accountNumber: string;
  accountHolderName: string;
  description: string;
  /** XenPlatform sub-account id — disburse from host balance */
  forUserId?: string;
  idempotencyKey: string;
};

export type XenditPayoutResponse = {
  id: string;
  reference_id: string;
  amount: string | number;
  currency: string;
  channel_code: string;
  status: XenditPayoutStatus;
  description?: string;
  created?: string;
  updated?: string;
  estimated_arrival_time?: string;
  failure_code?: string;
  failure_reason?: string;
  channel_properties?: {
    account_number?: string;
    account_holder_name?: string;
  };
};

export async function createXenditPayout(
  input: CreateXenditPayoutInput,
): Promise<XenditPayoutResponse> {
  const headers: Record<string, string> = {
    "Idempotency-key": input.idempotencyKey,
  };
  if (input.forUserId?.trim()) {
    headers["for-user-id"] = input.forUserId.trim();
  }

  return xenditRequest<XenditPayoutResponse>({
    method: "POST",
    path: "/v2/payouts",
    operation: "create payout",
    headers,
    body: {
      reference_id: input.referenceId,
      amount: String(Math.round(input.amountIdr)),
      currency: "IDR",
      channel_code: input.channelCode,
      channel_properties: {
        account_number: input.accountNumber,
        account_holder_name: input.accountHolderName,
      },
      description: input.description,
    },
  });
}

export async function getXenditPayout(
  payoutId: string,
  forUserId?: string,
): Promise<XenditPayoutResponse> {
  const headers: Record<string, string> = {};
  if (forUserId?.trim()) {
    headers["for-user-id"] = forUserId.trim();
  }

  return xenditRequest<XenditPayoutResponse>({
    method: "GET",
    path: `/v2/payouts/${encodeURIComponent(payoutId)}`,
    operation: "get payout",
    headers,
  });
}

export function normalizeXenditPayoutStatus(
  status: string | undefined,
): XenditPayoutStatus | null {
  const upper = status?.toUpperCase();
  if (
    upper === "ACCEPTED" ||
    upper === "REQUESTED" ||
    upper === "FAILED" ||
    upper === "SUCCEEDED" ||
    upper === "CANCELLED" ||
    upper === "REVERSED"
  ) {
    return upper;
  }
  return null;
}

export function mapXenditStatusToDisbursementStatus(
  status: XenditPayoutStatus,
): "accepted" | "requested" | "succeeded" | "failed" | "cancelled" | "reversed" {
  switch (status) {
    case "ACCEPTED":
      return "accepted";
    case "REQUESTED":
      return "requested";
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "REVERSED":
      return "reversed";
    default:
      return "accepted";
  }
}
