"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import {
  partnerPlayerSignupSchema,
  type PartnerPlayerSignupValues,
} from "@/lib/validations/partner-auth";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerSignupForm({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: Props) {
  const router = useRouter();
  const routes = partnerAuthRoutes(partnerSlug);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PartnerPlayerSignupValues>({
    resolver: zodResolver(partnerPlayerSignupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partner/public/${partnerSlug}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not create account");
        return;
      }
      toast.success("Account created — check your email to verify");
      router.push(json.data?.redirectTo ?? routes.checkEmail);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <PartnerAuthShell
      partnerSlug={partnerSlug}
      partnerName={partnerName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      formTitle="Create member account"
      formSubtitle={`Join ${partnerName}. This account is only for this partner site.`}
      wide
      footer={
        <>
          Already have an account?{" "}
          <Link href={routes.login} className="font-semibold text-cp-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <PartnerLoadingOverlay show={submitting} label="Creating account…" />
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField
          label="Full name"
          htmlFor="partner-signup-name"
          error={form.formState.errors.displayName?.message}
        >
          <AuthInput
            id="partner-signup-name"
            autoComplete="name"
            placeholder="Your name"
            {...form.register("displayName")}
          />
        </AuthField>
        <AuthField label="Email" htmlFor="partner-signup-email" error={form.formState.errors.email?.message}>
          <AuthInput
            id="partner-signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            {...form.register("email")}
          />
        </AuthField>
        <AuthField label="Phone" htmlFor="partner-signup-phone" error={form.formState.errors.phone?.message}>
          <AuthInput
            id="partner-signup-phone"
            type="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            {...form.register("phone")}
          />
        </AuthField>
        <AuthField
          label="Password"
          htmlFor="partner-signup-password"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="partner-signup-password"
            autoComplete="new-password"
            placeholder="Min. 8 chars, upper, lower, number"
            {...form.register("password")}
          />
        </AuthField>
        <AuthField
          label="Confirm password"
          htmlFor="partner-signup-confirm"
          error={form.formState.errors.confirmPassword?.message}
        >
          <PasswordInput
            id="partner-signup-confirm"
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
          Create account
        </Button>
      </form>
    </PartnerAuthShell>
  );
}
