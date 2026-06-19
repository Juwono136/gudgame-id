export type HostBankAccountView = {
  id: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  maskedAccount: string;
  label: string | null;
  isPrimary: boolean;
};

export type HostBankPayoutProfileView = {
  configured: boolean;
  accounts: HostBankAccountView[];
  maxAccounts: number;
  payoutSchedule: string;
  status: string | null;
  xenPlatformLinked: boolean;
  businessName: string | null;
  /** True when DB migration for multi-bank accounts has not been applied yet */
  migrationRequired?: boolean;
};
