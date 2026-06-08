import { z } from "zod";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { phoneCountryIsoCodes } from "@/lib/constants/phone-countries";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxPhotoBytes = 2 * 1024 * 1024;

export const registerSchema = z
  .object({
    fullNameKtp: z
      .string()
      .trim()
      .min(3, "Full name must be at least 3 characters")
      .max(150, "Full name is too long")
      .regex(
        /^[\p{L}\s'.-]+$/u,
        "Use letters as shown on your ID (no numbers or symbols)",
      ),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    phoneCountryCode: z
      .string()
      .refine((v) => phoneCountryIsoCodes.includes(v), "Select a valid country"),
    phone: z
      .string()
      .trim()
      .min(8, "Enter a valid phone number")
      .max(15, "Phone number is too long")
      .regex(/^[0-9]+$/, "Phone number must contain digits only"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    nickname: z
      .string()
      .optional()
      .or(z.literal(""))
      .superRefine((v, ctx) => {
        if (!v) return;
        const err = getNicknameFormatError(v);
        if (err) {
          ctx.addIssue({ code: "custom", message: err });
        }
      }),
    clubName: z
      .string()
      .trim()
      .max(100, "Club name is too long")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function validateProfilePhoto(file: File | null | undefined):
  | { ok: true; file: File }
  | { ok: false; message: string } {
  if (!file || file.size === 0) {
    return { ok: false, message: "Profile photo is required" };
  }
  if (!imageMimeTypes.includes(file.type)) {
    return {
      ok: false,
      message: "Photo must be JPEG, PNG, WebP, or GIF",
    };
  }
  if (file.size > maxPhotoBytes) {
    return { ok: false, message: "Photo must be 2 MB or smaller" };
  }
  return { ok: true, file };
}

export const MAX_PROFILE_PHOTO_BYTES = maxPhotoBytes;
