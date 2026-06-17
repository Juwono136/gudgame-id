"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { AuthPhoneFieldGroup } from "@/components/auth/auth-phone-field-group";
import { PasswordInput } from "@/components/auth/password-input";
import { PhotoUploadField } from "@/components/auth/photo-upload-field";
import { Button } from "@/components/ui/button";
import { defaultPhoneCountry } from "@/lib/constants/phone-countries";
import { authRoutes } from "@/lib/constants/routes";
import {
  registerSchema,
  validateProfilePhoto,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { useRegisterMutation } from "@/hooks/use-auth-mutations";
import { useAuthUiStore } from "@/stores/auth-ui-store";
import { cn } from "@/lib/utils";

export function RegisterForm({ callbackUrl: callbackUrlProp }: { callbackUrl?: string | null }) {
  const searchParams = useSearchParams();
  const callbackUrl = callbackUrlProp ?? searchParams.get("callbackUrl");
  const loginHref = callbackUrl
    ? `${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : authRoutes.login;

  const registerMutation = useRegisterMutation(callbackUrl);
  const isSubmitting = useAuthUiStore((s) => s.isSubmitting);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullNameKtp: "",
      email: "",
      phoneCountryCode: defaultPhoneCountry.code,
      phone: "",
      password: "",
      confirmPassword: "",
      nickname: "",
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    const photoCheck = validateProfilePhoto(photo);
    if (!photoCheck.ok) {
      setPhotoError(photoCheck.message);
      return;
    }
    setPhotoError(undefined);

    const formData = new FormData();
    formData.append("photo", photoCheck.file);
    formData.append("fullNameKtp", values.fullNameKtp);
    formData.append("email", values.email);
    formData.append("phoneCountryCode", values.phoneCountryCode);
    formData.append("phone", values.phone);
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);
    if (values.nickname) formData.append("nickname", values.nickname);

    registerMutation.mutate(formData, {
      onError: (err: Error & { fieldErrors?: Record<string, string[]> }) => {
        if (err.fieldErrors) {
          for (const [key, messages] of Object.entries(err.fieldErrors)) {
            if (messages?.[0] && key in values) {
              setError(key as keyof RegisterFormValues, { message: messages[0] });
            }
          }
          if (err.fieldErrors.photo?.[0]) {
            setPhotoError(err.fieldErrors.photo[0]);
          }
        }
      },
    });
  };

  return (
    <AuthShell
      variant="register"
      formSize="wide"
      formTitle="Create Account"
      formSubtitle="Join TandingBase and start contributing to the wiki."
      footer={
        <p className="text-sm text-cp-muted">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-semibold text-cp-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      }
    >
      <GoogleSignInButton label="Sign up with Google" />
      <AuthDivider />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PhotoUploadField
          error={photoError}
          onChange={(file) => {
            setPhoto(file);
            if (file) setPhotoError(undefined);
          }}
        />

        <AuthField
          label="Full name (as shown on ID)"
          htmlFor="fullNameKtp"
          error={errors.fullNameKtp?.message}
          required
        >
          <AuthInput
            id="fullNameKtp"
            placeholder="Legal name on KTP / passport"
            aria-invalid={!!errors.fullNameKtp}
            {...register("fullNameKtp")}
          />
        </AuthField>

        <AuthField label="Email" htmlFor="email" error={errors.email?.message} required>
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </AuthField>

        <AuthPhoneFieldGroup
          control={control}
          register={register}
          countryError={errors.phoneCountryCode?.message}
          phoneError={errors.phone?.message}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AuthField
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint="Min 8 chars, upper, lower, number"
            required
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </AuthField>

          <AuthField
            label="Confirm password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </AuthField>
        </div>

        <AuthField
          label="Nickname"
          htmlFor="nickname"
          error={errors.nickname?.message}
          hint="Optional — unique, 3-50 chars, letters/numbers only (no spaces)"
        >
          <AuthInput
            id="nickname"
            placeholder="e.g. padel_pro_jakarta"
            autoComplete="username"
            {...register("nickname", {
              setValueAs: (v: string) => v.replace(/\s/g, ""),
            })}
          />
        </AuthField>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "btn-interactive mt-4 h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-[#0033C0]",
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
