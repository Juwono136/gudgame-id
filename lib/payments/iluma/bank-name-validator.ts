import "server-only";

import { AppError } from "@/lib/errors";
import { ilumaRequest } from "@/lib/payments/iluma/client";

type IlumaBankNameValidatorRequest = {
  bank_account_number: string;
  bank_code: string; // expects ID_* for Indonesia
  given_name: string;
  surname?: string;
  reference_id?: string;
};

type IlumaBankNameValidatorResponse = {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  result?: {
    is_found?: boolean;
    name_matching_result?: "MATCH" | "NOT_MATCH" | "NOT_CONCLUSIVE";
    is_virtual_account?: boolean;
  };
};

function splitName(fullName: string): { given: string; surname?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { given: fullName.trim() };
  return { given: parts.slice(0, -1).join(" "), surname: parts.slice(-1).join(" ") };
}

export async function verifyIndonesiaBankAccount(input: {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!process.env.ILUMA_API_KEY?.trim()) {
    // Verification service not configured in this environment.
    return { ok: false, reason: "Bank verification is not configured (ILUMA_API_KEY missing)." };
  }
  if (!input.bankCode.startsWith("ID_")) {
    return { ok: false, reason: "Bank code must use ID_* format for verification." };
  }

  const { given, surname } = splitName(input.accountHolder.toUpperCase());
  const reference_id = `tb_bank_${Date.now()}`;

  const created = await ilumaRequest<IlumaBankNameValidatorResponse>({
    method: "POST",
    path: "/v2.2/identity/bank_account_data_requests",
    operation: "bank name validate",
    body: {
      bank_account_number: input.accountNumber,
      bank_code: input.bankCode,
      given_name: given,
      surname,
      reference_id,
    } satisfies IlumaBankNameValidatorRequest,
  });

  const startedAt = Date.now();
  const TIMEOUT_MS = 8000;

  let current = created;
  while (current.status === "PENDING" && Date.now() - startedAt < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 800));
    current = await ilumaRequest<IlumaBankNameValidatorResponse>({
      method: "GET",
      path: `/v2.2/identity/bank_account_data_requests/${encodeURIComponent(current.id)}`,
      operation: "bank name validate (poll)",
    });
  }

  if (current.status !== "COMPLETED") {
    throw new AppError("Bank verification is still processing. Please try again.", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const isFound = current.result?.is_found === true;
  if (!isFound) return { ok: false, reason: "Account not found." };

  const match = current.result?.name_matching_result;
  if (match === "MATCH") return { ok: true };
  if (match === "NOT_MATCH") return { ok: false, reason: "Account name does not match bank records." };
  return { ok: false, reason: "Account name match is not conclusive." };
}

