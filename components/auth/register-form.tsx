"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { AuthPhoneFieldGroup } from "@/components/auth/auth-phone-field-group";
import { defaultPhoneCountry } from "@/lib/constants/phone-countries";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { authRoutes } from "@/lib/constants/routes";
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth";
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

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      phoneCountryCode: defaultPhoneCountry.code,
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    const formData = new FormData();
    formData.append("email", values.email);
    if (values.phone?.trim()) {
      formData.append("phone", values.phone.trim());
      if (values.phoneCountryCode) {
        formData.append("phoneCountryCode", values.phoneCountryCode);
      }
    }
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);

    registerMutation.mutate(formData, {
      onError: (err: Error & { fieldErrors?: Record<string, string[]> }) => {
        if (err.fieldErrors) {
          for (const [key, messages] of Object.entries(err.fieldErrors)) {
            if (messages?.[0] && key in values) {
              setError(key as keyof RegisterFormValues, { message: messages[0] });
            }
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
      formSubtitle="Join Gud Game — add your phone optionally, then complete your profile after signing in."
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Phone (optional)</legend>
          <AuthPhoneFieldGroup
            control={control}
            register={register}
            countryError={errors.phoneCountryCode?.message}
            phoneError={errors.phone?.message}
          />
        </fieldset>

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

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "btn-interactive mt-4 h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-[#00a67a]",
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
