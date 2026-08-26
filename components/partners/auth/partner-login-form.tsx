"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { AuthDivider } from "@/components/auth/auth-divider";
import { Button } from "@/components/ui/button";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { PartnerGoogleAuthButton } from "@/components/partners/auth/partner-google-auth-button";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { emitPartnerPlayerAuthEvent } from "@/lib/partners/auth/client-events";
import {
  partnerPlayerLoginSchema,
  type PartnerPlayerLoginValues,
} from "@/lib/validations/partner-auth";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerLoginForm({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routes = partnerAuthRoutes(partnerSlug);
  const callbackUrl = searchParams.get("callbackUrl");
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const form = useForm<PartnerPlayerLoginValues>({
    resolver: zodResolver(partnerPlayerLoginSchema),
    defaultValues: { email: "", password: "", callbackUrl: callbackUrl ?? undefined },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partner/public/${partnerSlug}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          callbackUrl: callbackUrl ?? values.callbackUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json?.error?.code;
        const message = json?.error?.message ?? "Could not sign in";
        if (code === "EMAIL_NOT_VERIFIED") {
          toast.error(message, {
            action: {
              label: "Resend email",
              onClick: () => {
                void fetch(`/api/partner/public/${partnerSlug}/auth/resend-verification`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: values.email }),
                }).then(() => toast.success("Verification email sent"));
              },
            },
          });
          router.push(
            `${routes.checkEmail}?email=${encodeURIComponent(values.email)}`,
          );
          return;
        }
        toast.error(message);
        return;
      }
      toast.success(`Welcome back to ${partnerName}`);
      emitPartnerPlayerAuthEvent(partnerSlug, "login");
      router.push(json.data?.redirectTo ?? routes.home);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });

  const busy = submitting || googleBusy;

  return (
    <PartnerAuthShell
      partnerSlug={partnerSlug}
      partnerName={partnerName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      formTitle="Member sign in"
      formSubtitle={`Sign in to your ${partnerName} member account.`}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={routes.signup} className="font-semibold text-cp-primary hover:underline">
            Create one
          </Link>
          <span className="mt-2 block text-[11px] text-cp-muted/80">
            Organizer?{" "}
            <Link href="/login" className="underline hover:text-foreground">
              Staff sign in (Gud Game)
            </Link>
          </span>
        </>
      }
    >
      <PartnerLoadingOverlay show={submitting} label="Signing in…" />
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="Email" htmlFor="partner-login-email" error={form.formState.errors.email?.message}>
          <AuthInput
            id="partner-login-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            disabled={busy}
            {...form.register("email")}
          />
        </AuthField>
        <AuthField
          label="Password"
          htmlFor="partner-login-password"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="partner-login-password"
            autoComplete="current-password"
            placeholder="Your password"
            disabled={busy}
            {...form.register("password")}
          />
        </AuthField>
        <div className="flex justify-end">
          <Link
            href={routes.forgotPassword}
            className="text-xs font-medium text-cp-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="btn-interactive h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-cp-primary-light"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
      <AuthDivider />
      <PartnerGoogleAuthButton
        partnerSlug={partnerSlug}
        partnerName={partnerName}
        mode="signin"
        callbackUrl={callbackUrl}
        disabled={submitting}
        onBusyChange={setGoogleBusy}
      />
    </PartnerAuthShell>
  );
}
