import { z } from "zod";
import {
  isValidPartnerPhone,
  normalizePartnerPhone,
} from "@/lib/partners/registration/phone";

/** Letters (any script) with limited separators — blocks numeric/spam names. */
const PERSON_NAME_RE =
  /^[\p{L}\p{M}][\p{L}\p{M}\d\s.'’\-]{0,118}[\p{L}\p{M}\d]?$/u;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Coerce missing optional fields (JSON omits `undefined` after client transforms). */
function asOptionalString(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

function isValidOptionalEmail(value: string): boolean {
  if (!value) return true;
  if (value.includes("..") || value.endsWith(".invalid")) return false;
  return z.string().email().safeParse(value).success;
}

export const partnerPersonNameSchema = z
  .string()
  .transform(normalizeWhitespace)
  .pipe(
    z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name must be 120 characters or fewer")
      .refine((value) => /[\p{L}]/u.test(value), "Name must include letters")
      .refine(
        (value) => PERSON_NAME_RE.test(value),
        "Enter a valid name (letters only, optional spaces or hyphens)",
      )
      .refine((value) => !/(.)\1{4,}/u.test(value), "Enter a real name"),
  );

export const partnerEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Enter a valid email address")
  .refine((value) => !value.includes(".."), "Enter a valid email address")
  .refine((value) => !value.endsWith(".invalid"), "Enter a valid email address");

const optionalMemberEmailSchema = z.preprocess(
  asOptionalString,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email is too long")
    .refine(isValidOptionalEmail, "Enter a valid email address")
    .transform((value) => (value === "" ? undefined : value)),
);

const captainPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine(isValidPartnerPhone, "Enter a valid phone number (e.g. 0812xxxxxxx)");

const optionalMemberPhoneSchema = z.preprocess(
  asOptionalString,
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isValidPartnerPhone(value),
      "Enter a valid phone number (e.g. 0812xxxxxxx)",
    )
    .transform((value) => (value === "" ? undefined : value)),
);

const optionalPartnerPlayerIdSchema = z.preprocess(
  (value) => (value == null || value === "" ? undefined : value),
  z.string().uuid("Invalid player id").optional(),
);

const captainSchema = z.object({
  fullName: partnerPersonNameSchema,
  email: partnerEmailSchema,
  phone: captainPhoneSchema,
});

/**
 * Teammate default = claimable (name + email and/or phone).
 * Soft profile (name only) requires softProfile: true — explicit walk-up fallback.
 * partnerPlayerId links an existing partner_players row from search (never Gud Game users).
 */
const memberSchema = z
  .object({
    fullName: partnerPersonNameSchema,
    email: optionalMemberEmailSchema,
    phone: optionalMemberPhoneSchema,
    partnerPlayerId: optionalPartnerPlayerIdSchema,
    softProfile: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional()
      .transform((value) => value === true || value === "true"),
  })
  .superRefine((member, ctx) => {
    const soft = member.softProfile === true;
    if (!soft && !member.email && !member.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Add an email or phone so they can claim their player profile, or choose name-only.",
        path: ["email"],
      });
    }
  });

function safePhoneKey(raw: string): string | null {
  try {
    return normalizePartnerPhone(raw);
  } catch {
    return raw.trim() || null;
  }
}

/** Guest registration form schema — member count depends on tournament playersPerTeam. */
export function partnerGuestRegistrationSchema(playersPerTeam: number) {
  const memberCount = Math.max(0, playersPerTeam - 1);

  return z
    .object({
      captain: captainSchema,
      teamName:
        playersPerTeam > 1
          ? z
              .string()
              .transform(normalizeWhitespace)
              .pipe(
                z
                  .string()
                  .min(2, "Team name must be at least 2 characters")
                  .max(120, "Team name must be 120 characters or fewer")
                  .refine(
                    (value) => /[\p{L}\d]/u.test(value),
                    "Team name must include letters or numbers",
                  ),
              )
          : z.preprocess(
              asOptionalString,
              z
                .string()
                .trim()
                .max(120)
                .transform((value) => (value === "" ? undefined : value)),
            ),
      members: z.preprocess(
        (value) => (Array.isArray(value) ? value : []),
        z.array(memberSchema).length(memberCount, {
          message:
            memberCount === 0
              ? "This tournament does not accept additional teammates"
              : `Add exactly ${memberCount} teammate${memberCount === 1 ? "" : "s"}`,
        }),
      ),
      notes: z.preprocess(
        asOptionalString,
        z
          .string()
          .trim()
          .max(500, "Notes must be 500 characters or fewer")
          .transform((value) => (value === "" ? undefined : value)),
      ),
    })
    .superRefine((data, ctx) => {
      const emails = new Set<string>([data.captain.email]);
      for (const [index, member] of data.members.entries()) {
        if (!member.email) continue;
        if (emails.has(member.email)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Each player needs a unique email",
            path: ["members", index, "email"],
          });
        }
        emails.add(member.email);
      }

      const phones = new Set<string>();
      const captainPhoneKey = safePhoneKey(data.captain.phone);
      if (captainPhoneKey) phones.add(captainPhoneKey);

      for (const [index, member] of data.members.entries()) {
        if (!member.phone) continue;
        const key = safePhoneKey(member.phone);
        if (!key) continue;
        if (phones.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Each player needs a unique phone number",
            path: ["members", index, "phone"],
          });
        }
        phones.add(key);
      }

      const linkedIds = new Set<string>();
      for (const [index, member] of data.members.entries()) {
        if (!member.partnerPlayerId) continue;
        if (linkedIds.has(member.partnerPlayerId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Each teammate can only be selected once",
            path: ["members", index, "partnerPlayerId"],
          });
        }
        linkedIds.add(member.partnerPlayerId);
      }
    });
}

export type PartnerGuestCaptainInput = z.infer<typeof captainSchema>;
export type PartnerGuestMemberInput = z.infer<typeof memberSchema>;
export type PartnerGuestRegistrationInput = z.infer<
  ReturnType<typeof partnerGuestRegistrationSchema>
>;
