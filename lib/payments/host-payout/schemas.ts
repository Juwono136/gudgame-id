import { z } from "zod";
import { PAYOUT_SCHEDULES } from "@/lib/payments/host-payout/constants";

const bankAccountFields = {
  bankCode: z.string().min(2).max(20),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{8,20}$/, "Account number must be 8–20 digits"),
  bankAccountHolder: z.string().trim().min(3).max(120),
  label: z.string().trim().max(60).optional(),
};

export const bankPayoutSchema = z.object({
  ...bankAccountFields,
  payoutSchedule: z.enum(PAYOUT_SCHEDULES).default("weekly"),
});

export const addBankAccountSchema = z.object(bankAccountFields);

export const updateBankAccountSchema = z.object({
  ...bankAccountFields,
  id: z.string().uuid(),
});

export const setPrimaryBankSchema = z.object({
  accountId: z.string().uuid(),
});

export const payoutScheduleSchema = z.object({
  payoutSchedule: z.enum(PAYOUT_SCHEDULES),
});

export type BankPayoutInput = z.infer<typeof bankPayoutSchema>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
