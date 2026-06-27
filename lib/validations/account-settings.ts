import { z } from "zod";
import { passwordSchema } from "@/lib/validations/auth";
import { playerEquipmentListSchema } from "@/lib/wiki/player-equipment";
import { PLAYER_GALLERY_MAX } from "@/lib/wiki/constants";
import {
  PLAYER_AGE_MAX,
  PLAYER_AGE_MIN,
  PLAYER_BIOGRAPHY_MAX,
  PLAYER_NATIONALITY_MAX,
  PLAYER_SUMMARY_MAX,
  playerSocialLinksSchema,
} from "@/lib/wiki/player-profile-fields";

import { sportInterestSlugsSchema } from "@/lib/validations/profile-completion";
import { USER_GENDERS } from "@/lib/constants/user-gender";

export const staffProfileUpdateSchema = z.object({
  fullNameKtp: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
  phoneCountryCode: z.string().trim().min(1, "Country code is required").max(8),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number must be at least 8 digits")
    .max(20)
    .regex(/^\d+$/, "Phone must contain digits only"),
  sportInterestSlugs: sportInterestSlugsSchema.optional(),
  gender: z.enum(USER_GENDERS, { message: "Select your gender" }),
});

export type StaffProfileUpdateInput = z.infer<typeof staffProfileUpdateSchema>;

const passwordPairSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const setPasswordSettingsSchema = passwordPairSchema;

export type SetPasswordSettingsInput = z.infer<typeof setPasswordSettingsSchema>;

export const changePasswordSettingsSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordSettingsInput = z.infer<typeof changePasswordSettingsSchema>;

export const wikiMediaItemSchema = z.object({
  url: z.string().max(2048).optional(),
  storageKey: z.string().max(512).optional(),
  caption: z.string().max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const playerProfileUpsertSchema = z.object({
  biography: z.string().trim().max(PLAYER_BIOGRAPHY_MAX).optional().or(z.literal("")),
  summary: z.string().trim().max(PLAYER_SUMMARY_MAX).optional().or(z.literal("")),
  nationality: z.string().trim().max(PLAYER_NATIONALITY_MAX).optional().or(z.literal("")),
  age: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .int()
        .min(PLAYER_AGE_MIN, `Age must be at least ${PLAYER_AGE_MIN}`)
        .max(PLAYER_AGE_MAX, `Age must be at most ${PLAYER_AGE_MAX}`),
    ])
    .optional(),
  socialLinks: playerSocialLinksSchema.default([]),
  signatureGearId: z.string().max(64).optional().or(z.literal("")),
  equipment: playerEquipmentListSchema.default([]),
  gallery: z.array(wikiMediaItemSchema).max(PLAYER_GALLERY_MAX).default([]),
});

export type PlayerProfileUpsertInput = z.infer<typeof playerProfileUpsertSchema>;
