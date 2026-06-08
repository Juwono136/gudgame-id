"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Mail } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSimpleShell } from "@/components/auth/auth-simple-shell";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import { useRequestPasswordResetMutation } from "@/hooks/use-auth-mutations";
import { authRoutes } from "@/lib/constants/routes";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";
import { useAuthUiStore } from "@/stores/auth-ui-store";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const mutation = useRequestPasswordResetMutation();
  const isSubmitting = useAuthUiStore((s) => s.isSubmitting);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <AuthSimpleShell
      formTitle="Forgot password?"
      formSubtitle="Enter the email address linked to your TandingBase account."
      footer={
        <p className="text-sm text-cp-muted">
          Remember your password?{" "}
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
          mutation.mutate(values, {
            onError: (err: Error) => {
              if (err.message.toLowerCase().includes("no tandingbase account")) {
                setError("email", { message: err.message });
              }
            },
          }),
        )}
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "btn-interactive h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-[#0033C0]",
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending link…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthSimpleShell>
  );
}
