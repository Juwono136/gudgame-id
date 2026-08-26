"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import {
  partnerPlayerForgotPasswordSchema,
  type PartnerPlayerForgotPasswordValues,
} from "@/lib/validations/partner-auth";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerForgotPasswordForm({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: Props) {
  const router = useRouter();
  const routes = partnerAuthRoutes(partnerSlug);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PartnerPlayerForgotPasswordValues>({
    resolver: zodResolver(partnerPlayerForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/partner/public/${partnerSlug}/auth/forgot-password`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not send reset email");
        return;
      }
      router.push(json.data?.redirectTo ?? routes.forgotPasswordSent);
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
      formTitle="Forgot password"
      formSubtitle={`We'll email a reset link for your ${partnerName} member account.`}
      footer={
        <Link href={routes.login} className="font-semibold text-cp-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <PartnerLoadingOverlay show={submitting} label="Sending…" />
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="Email" htmlFor="partner-forgot-email" error={form.formState.errors.email?.message}>
          <AuthInput
            id="partner-forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            {...form.register("email")}
          />
        </AuthField>
        <Button
          type="submit"
          disabled={submitting}
          className="btn-interactive h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-cp-primary-light"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
    </PartnerAuthShell>
  );
}
