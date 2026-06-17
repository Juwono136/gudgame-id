import { z } from "zod";

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
  payoutSchedule: z.enum(["weekly", "biweekly", "monthly"]).default("weekly"),
});

export const addBankAccountSchema = z.object(bankAccountFields);

export const updateBankAccountSchema = z.object({
  ...bankAccountFields,
  id: z.number().int().positive(),
});

export const setPrimaryBankSchema = z.object({
  accountId: z.number().int().positive(),
});

export const payoutScheduleSchema = z.object({
  payoutSchedule: z.enum(["weekly", "biweekly", "monthly"]),
});

export type BankPayoutInput = z.infer<typeof bankPayoutSchema>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
