import "server-only";

import { xenditRequest } from "@/lib/payments/xendit/client";

export type XenditManagedAccount = {
  id: string;
  email: string;
  status: string;
  type?: string;
};

export type CreateManagedAccountInput = {
  email: string;
  businessName: string;
};

export async function createManagedSubAccount(
  input: CreateManagedAccountInput,
): Promise<XenditManagedAccount> {
  return xenditRequest<XenditManagedAccount>({
    path: "/v2/accounts",
    body: {
      email: input.email,
      type: "MANAGED",
      public_profile: {
        business_name: input.businessName,
      },
    },
    operation: "create managed sub-account",
  });
}

export async function getManagedSubAccount(accountId: string): Promise<XenditManagedAccount> {
  return xenditRequest<XenditManagedAccount>({
    method: "GET",
    path: `/v2/accounts/${accountId}`,
    operation: "get managed sub-account",
  });
}
