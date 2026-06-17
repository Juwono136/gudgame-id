import "server-only";

import { ilumaRequest } from "@/lib/payments/iluma/client";

export type IlumaBankCode = {
  name: string;
  code: string;
  swift_code?: string;
  remark?: string;
};

export type IndonesiaBankOption = {
  code: string; // e.g. ID_BCA
  name: string;
  canNameValidate: boolean; // Iluma is the validator
};

let cached: { atMs: number; banks: IndonesiaBankOption[] } | null = null;
const CACHE_MS = 1000 * 60 * 60 * 24; // 24h

export async function getIndonesiaBankCodes(): Promise<IndonesiaBankOption[]> {
  const now = Date.now();
  if (cached && now - cached.atMs < CACHE_MS) return cached.banks;

  const banks = await ilumaRequest<IlumaBankCode[]>({
    method: "GET",
    path: "/v1.2/bank/available_bank_codes",
    operation: "get available bank codes",
  });

  const mapped = banks
    .filter((b) => (b.code ?? "").startsWith("ID_"))
    .map((b) => ({
      code: b.code,
      name: b.name,
      canNameValidate: true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  cached = { atMs: now, banks: mapped };
  return mapped;
}

