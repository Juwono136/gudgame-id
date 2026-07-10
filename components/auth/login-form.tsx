"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Lock, Mail } from "lucide-react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { useLoginMutation, useResendVerificationMutation } from "@/hooks/use-auth-mutations";
import { authRoutes } from "@/lib/constants/routes";
import { useAuthUiStore } from "@/stores/auth-ui-store";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session_expired";
  const passwordResetSuccess = searchParams.get("reset") === "success";
  const accountInactive = searchParams.get("error") === "account_inactive";
  const loginMutation = useLoginMutation();
  const resendVerification = useResendVerificationMutation();
  const isSubmitting = useAuthUiStore((s) => s.isSubmitting);
  const [showResend, setShowResend] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <AuthShell
      variant="login"
      formTitle="Welcome Back"
      formSubtitle="Access your dashboard and stats."
      footer={
        <p className="text-sm text-cp-muted">
          New to Gud Game?{" "}
          <Link
            href={authRoutes.register}
            className="font-semibold text-cp-primary hover:underline"
          >
            Create an Account
          </Link>
        </p>
      }
    >
      {sessionExpired ? (
        <div className="mb-4 rounded-lg border border-cp-border bg-cp-elevated/80 p-3 text-left">
          <p className="text-xs leading-relaxed text-slate-300">
            Your session has expired after 7 days of inactivity. Please sign in
            again to continue.
          </p>
        </div>
      ) : null}

      {passwordResetSuccess ? (
        <div className="mb-4 rounded-lg border border-[#DAF8E7]/30 bg-[#1C352A]/60 p-3 text-left">
          <p className="text-xs leading-relaxed text-slate-200">
            Your password was updated successfully. Sign in with your new password.
          </p>
        </div>
      ) : null}

      {accountInactive ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-left">
          <p className="text-xs leading-relaxed text-amber-100">
            This account has been deactivated and cannot sign in. Contact an
            administrator if you believe this is a mistake.
          </p>
        </div>
      ) : null}

      <GoogleSignInButton />
      <AuthDivider />

      <form
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setShowResend(false);
          loginMutation.mutate(values, {
            onError: (err: Error) => {
              if (err.message.toLowerCase().includes("verify")) {
                setShowResend(true);
              }
            },
          });
        })}
        noValidate
      >
        <AuthField
          label="Email Address"
          htmlFor="email"
          error={errors.email?.message}
          required
        >
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <AuthInput
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
        </AuthField>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="password"
              className="text-xs font-medium text-cp-muted"
            >
              Password <span className="text-cp-primary">*</span>
            </label>
            <Link
              href={authRoutes.forgotPassword}
              className="text-xs font-semibold text-cp-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <PasswordInput
              id="password"
              placeholder="••••••••"
              className="pl-10"
              aria-invalid={!!errors.password}
              autoComplete="current-password"
              {...register("password")}
            />
          </div>
          {errors.password?.message ? (
            <p className="text-xs text-[#ff6b6b]" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

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
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        {showResend ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left">
            <p className="text-xs leading-relaxed text-amber-100/90">
              Your email may not be verified yet, or your confirmation link expired (valid
              for 24 hours).
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-cp-primary hover:underline"
              disabled={resendVerification.isPending}
              onClick={() => {
                const email = watch("email");
                if (email) resendVerification.mutate(email);
              }}
            >
              {resendVerification.isPending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
}
