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
