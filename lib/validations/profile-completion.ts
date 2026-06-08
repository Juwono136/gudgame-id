import { z } from "zod";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { phoneCountryIsoCodes } from "@/lib/constants/phone-countries";

export const completeProfileSchema = z.object({
  fullNameKtp: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(150, "Full name is too long")
    .regex(
      /^[\p{L}\s'.-]+$/u,
      "Use letters as shown on your ID (no numbers or symbols)",
    ),
  phoneCountryCode: z
    .string()
    .refine((v) => phoneCountryIsoCodes.includes(v), "Select a valid country"),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number")
    .max(15, "Phone number is too long")
    .regex(/^[0-9]+$/, "Phone number must contain digits only"),
  nickname: z
    .string()
    .optional()
    .or(z.literal(""))
    .superRefine((v, ctx) => {
      if (!v) return;
      const err = getNicknameFormatError(v);
      if (err) ctx.addIssue({ code: "custom", message: err });
    }),
});

export type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;
