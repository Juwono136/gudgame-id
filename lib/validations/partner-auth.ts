import { z } from "zod";
import { passwordSchema } from "@/lib/validations/auth";

const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

export const partnerPlayerLoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export type PartnerPlayerLoginValues = z.infer<typeof partnerPlayerLoginSchema>;

export const partnerPlayerSignupSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name is too long"),
    email: emailField,
    phone: z
      .string()
      .trim()
      .min(8, "Enter a valid phone number")
      .max(20, "Phone is too long")
      .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PartnerPlayerSignupValues = z.infer<typeof partnerPlayerSignupSchema>;

export const partnerPlayerForgotPasswordSchema = z.object({
  email: emailField,
});

export type PartnerPlayerForgotPasswordValues = z.infer<
  typeof partnerPlayerForgotPasswordSchema
>;

export const partnerPlayerResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PartnerPlayerResetPasswordValues = z.infer<
  typeof partnerPlayerResetPasswordSchema
>;

export const partnerPlayerVerifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const partnerPlayerResendVerifySchema = z.object({
  email: emailField,
});

export const partnerPlayerGoogleAuthSchema = z.object({
  idToken: z.string().min(10, "Missing Google sign-in token"),
  callbackUrl: z.string().optional(),
});

export type PartnerPlayerGoogleAuthValues = z.infer<
  typeof partnerPlayerGoogleAuthSchema
>;
