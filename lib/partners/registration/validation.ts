import { z } from "zod";
import { isValidPartnerPhone } from "@/lib/partners/registration/phone";

const captainSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(isValidPartnerPhone, "Enter a valid phone number"),
});

const memberSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || isValidPartnerPhone(value), "Enter a valid phone number")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Guest registration form schema — member count depends on tournament playersPerTeam. */
export function partnerGuestRegistrationSchema(playersPerTeam: number) {
  const memberCount = Math.max(0, playersPerTeam - 1);

  return z.object({
    captain: captainSchema,
    teamName:
      playersPerTeam > 1
        ? z.string().trim().min(2, "Team name must be at least 2 characters").max(120)
        : z.string().trim().max(120).optional(),
    members: z.array(memberSchema).length(memberCount),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must be 500 characters or fewer")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  });
}

export type PartnerGuestCaptainInput = z.infer<typeof captainSchema>;
export type PartnerGuestMemberInput = z.infer<typeof memberSchema>;
export type PartnerGuestRegistrationInput = z.infer<
  ReturnType<typeof partnerGuestRegistrationSchema>
>;
