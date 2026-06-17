import "server-only";

export {
  addHostBankAccount,
  deleteHostBankAccount,
  getHostBankPayoutProfile,
  getPrimaryBankAccount,
  MAX_HOST_BANK_ACCOUNTS,
  setPrimaryHostBankAccount,
  updateHostBankAccount,
  updateHostPayoutSchedule,
} from "@/lib/payments/host-payout/accounts";

export type { HostBankAccountView, HostBankPayoutProfileView } from "@/lib/payments/host-payout/types";
export type { AddBankAccountInput, BankPayoutInput, UpdateBankAccountInput } from "@/lib/payments/host-payout/schemas";

/** @deprecated Use addHostBankAccount — single-account save for legacy callers */
export async function saveHostBankPayout(
  userId: string,
  input: import("@/lib/payments/host-payout/schemas").BankPayoutInput,
) {
  const { addHostBankAccount, getHostBankPayoutProfile, updateHostPayoutSchedule } = await import(
    "@/lib/payments/host-payout/accounts"
  );
  const profile = await getHostBankPayoutProfile(userId);
  if (profile.accounts.length === 0) {
    await addHostBankAccount(userId, {
      bankCode: input.bankCode,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountHolder: input.bankAccountHolder,
    });
  } else {
    const primary = profile.accounts.find((a) => a.isPrimary) ?? profile.accounts[0];
    const { updateHostBankAccount } = await import("@/lib/payments/host-payout/accounts");
    await updateHostBankAccount(userId, {
      id: primary.id,
      bankCode: input.bankCode,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountHolder: input.bankAccountHolder,
    });
  }
  if (input.payoutSchedule) {
    await updateHostPayoutSchedule(userId, input.payoutSchedule);
  }
  return getHostBankPayoutProfile(userId);
}
