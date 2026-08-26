"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import {
  partnerPlayerResetPasswordSchema,
  type PartnerPlayerResetPasswordValues,
} from "@/lib/validations/partner-auth";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerResetPasswordForm({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const routes = partnerAuthRoutes(partnerSlug);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PartnerPlayerResetPasswordValues>({
    resolver: zodResolver(partnerPlayerResetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  useEffect(() => {
    form.setValue("token", token);
  }, [token, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/partner/public/${partnerSlug}/auth/reset-password`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not reset password");
        return;
      }
      toast.success("Password updated — sign in with your new password");
      router.push(json.data?.redirectTo ?? routes.login);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });

  if (!token) {
    return (
      <PartnerAuthShell
        partnerSlug={partnerSlug}
        partnerName={partnerName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        formTitle="Invalid reset link"
        formSubtitle="This password reset link is missing or incomplete."
        footer={
          <Link href={routes.forgotPassword} className="font-semibold text-cp-primary hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-cp-muted">
          Open the link from your email, or request a new reset email.
        </p>
      </PartnerAuthShell>
    );
  }

  return (
    <PartnerAuthShell
      partnerSlug={partnerSlug}
      partnerName={partnerName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      formTitle="Choose a new password"
      formSubtitle={`Set a new password for your ${partnerName} member account.`}
      wide
    >
      <PartnerLoadingOverlay show={submitting} label="Updating…" />
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" {...form.register("token")} />
        <AuthField
          label="New password"
          htmlFor="partner-reset-password"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="partner-reset-password"
            autoComplete="new-password"
            placeholder="Min. 8 chars, upper, lower, number"
            {...form.register("password")}
          />
        </AuthField>
        <AuthField
          label="Confirm password"
          htmlFor="partner-reset-confirm"
          error={form.formState.errors.confirmPassword?.message}
        >
          <PasswordInput
            id="partner-reset-confirm"
            autoComplete="new-password"
            placeholder="Repeat password"
            {...form.register("confirmPassword")}
          />
        </AuthField>
        <Button
          type="submit"
          disabled={submitting}
          className="btn-interactive h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-cp-primary-light"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </PartnerAuthShell>
  );
}
