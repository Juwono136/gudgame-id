import "server-only";

import { logger } from "@/lib/logger";
import { xenditRequest } from "@/lib/payments/xendit/client";

const log = logger.child({ module: "xendit-va" });

export type CreateCallbackVaInput = {
  externalId: string;
  bankCode: string;
  name: string;
  expectedAmount: number;
  metadata?: Record<string, string>;
};

export type XenditCallbackVaResponse = {
  id: string;
  external_id: string;
  account_number: string;
  bank_code: string;
  name: string;
  expected_amount: number;
  expiration_date: string;
  status: string;
};

export async function createCallbackVirtualAccount(
  input: CreateCallbackVaInput,
): Promise<XenditCallbackVaResponse> {
  log.debug("Creating callback VA", {
    externalId: input.externalId,
    bankCode: input.bankCode,
    amount: input.expectedAmount,
  });

  return xenditRequest<XenditCallbackVaResponse>({
    path: "/callback_virtual_accounts",
    body: {
      external_id: input.externalId,
      bank_code: input.bankCode,
      name: input.name.slice(0, 50),
      expected_amount: input.expectedAmount,
      is_closed: true,
      is_single_use: true,
      expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: input.metadata,
    },
    operation: "create callback VA",
  });
}
