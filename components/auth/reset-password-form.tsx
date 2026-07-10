"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Lock } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSimpleShell } from "@/components/auth/auth-simple-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { useResetPasswordMutation } from "@/hooks/use-auth-mutations";
import { PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";
import { authRoutes } from "@/lib/constants/routes";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth";
import { useAuthUiStore } from "@/stores/auth-ui-store";
import { cn } from "@/lib/utils";

const EXPIRY_HOURS = Math.max(
  1,
  Math.round(PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS / 3600),
);

function isInvalidTokenError(error: string | null): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    lower.includes("invalid") ||
    lower.includes("token") ||
    lower.includes("expired")
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");
  const mutation = useResetPasswordMutation();
  const isSubmitting = useAuthUiStore((s) => s.isSubmitting);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token || isInvalidTokenError(errorParam)) {
    return (
      <AuthSimpleShell
        formTitle="Link expired or invalid"
        formSubtitle="Request a new password reset link to continue."
        footer={
          <p className="text-sm text-cp-muted">
            <Link
              href={authRoutes.forgotPassword}
              className="font-semibold text-cp-primary hover:underline"
            >
              Request a new reset link
            </Link>
          </p>
        }
      >
        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <p>
            Reset links expire after{" "}
            <strong className="text-foreground">{EXPIRY_HOURS} hour(s)</strong> and work
            only once.
          </p>
          <Button
            asChild
            className="btn-interactive h-11 w-full rounded-lg bg-cp-primary font-semibold text-white hover:bg-[#00a67a]"
          >
            <Link href={authRoutes.forgotPassword}>Forgot password</Link>
          </Button>
        </div>
      </AuthSimpleShell>
    );
  }

  return (
    <AuthSimpleShell
      wide
      formTitle="Set a new password"
      formSubtitle="Choose a strong password you have not used on Gud Game before."
      footer={
        <p className="text-sm text-cp-muted">
          <Link
            href={authRoutes.login}
            className="font-semibold text-cp-primary hover:underline"
          >
            Back to Sign In
          </Link>
        </p>
      }
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit((values) =>
          mutation.mutate({ values, token }),
        )}
        noValidate
      >
        <AuthField
          label="New password"
          htmlFor="password"
          error={errors.password?.message}
          hint="Min 8 chars, upper, lower, number"
          required
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <PasswordInput
              id="password"
              autoComplete="new-password"
              className="pl-10"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </div>
        </AuthField>

        <AuthField
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              className="pl-10"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </div>
        </AuthField>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "btn-interactive h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-[#00a67a]",
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthSimpleShell>
  );
}
