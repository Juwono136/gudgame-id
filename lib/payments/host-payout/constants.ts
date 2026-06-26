export const INDONESIAN_BANKS = [
  { code: "BCA", label: "BCA" },
  { code: "MANDIRI", label: "Bank Mandiri" },
  { code: "BNI", label: "BNI" },
  { code: "BRI", label: "BRI" },
  { code: "PERMATA", label: "Bank Permata" },
  { code: "CIMB", label: "CIMB Niaga" },
] as const;

export const PAYOUT_SCHEDULES = ["weekly", "biweekly", "monthly"] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

export const PAYOUT_SCHEDULE_OPTIONS: {
  value: PayoutSchedule;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "weekly",
    label: "Weekly",
    shortLabel: "Every week",
    description: "Earnings from paid registrations are batched and sent every 7 days.",
  },
  {
    value: "biweekly",
    label: "Every 2 weeks",
    shortLabel: "Bi-weekly",
    description: "Payouts are grouped and transferred every 14 days.",
  },
  {
    value: "monthly",
    label: "Monthly",
    shortLabel: "Once a month",
    description: "A single consolidated transfer at the end of each calendar month.",
  },
];

export function isPayoutSchedule(value: string): value is PayoutSchedule {
  return (PAYOUT_SCHEDULES as readonly string[]).includes(value);
}

export function normalizePayoutSchedule(value: string | null | undefined): PayoutSchedule {
  if (value && isPayoutSchedule(value)) return value;
  return "weekly";
}

export function payoutScheduleLabel(value: string): string {
  return PAYOUT_SCHEDULE_OPTIONS.find((o) => o.value === value)?.label ?? "Weekly";
}
