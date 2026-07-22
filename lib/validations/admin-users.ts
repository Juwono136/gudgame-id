import { z } from "zod";
import { APP_ROLES } from "@/lib/roles/constants";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { phoneCountryIsoCodes } from "@/lib/constants/phone-countries";

const roleSchema = z.enum(APP_ROLES);

/** Admin create user — same profile fields as public registration (no password) */
export const adminCreateUserSchema = z.object({
  fullNameKtp: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(150, "Full name is too long")
    .regex(
      /^[\p{L}\s'.-]+$/u,
      "Use letters as shown on ID (no numbers or symbols)",
    ),
  email: z.string().trim().email("Enter a valid email address").max(255),
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
      const trimmed = v?.trim() ?? "";
      if (!trimmed) return;
      const err = getNicknameFormatError(trimmed);
      if (err) ctx.addIssue({ code: "custom", message: err });
    }),
  roles: z.array(roleSchema).min(1, "Select at least one role"),
  isActive: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((v) => v === true || v === "true")
    .default(true),
});

export const adminUsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  sortBy: z.enum(["name", "nickname", "lastLogin"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(8).max(128).optional(),
  nickname: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((v) => v == null || v === "" || getNicknameFormatError(v) === null, {
      message: "Invalid nickname format",
    }),
  roles: z.array(roleSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

/** Edit from User Management — roles and account status only */
export const adminEditStaffUserSchema = z.object({
  roles: z.array(roleSchema).min(1),
  isActive: z.boolean(),
});

export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminEditStaffUserInput = z.infer<typeof adminEditStaffUserSchema>;
