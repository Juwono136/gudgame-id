"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { Button } from "@/components/ui/button";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { emitPartnerPlayerAuthEvent } from "@/lib/partners/auth/client-events";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerVerifyEmailClient({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: Props) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const routes = partnerAuthRoutes(partnerSlug);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Verifying your email…" : "Missing verification token.",
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/partner/public/${partnerSlug}/auth/verify-email`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage(json?.error?.message ?? "Verification failed");
          return;
        }
        setStatus("ok");
        setMessage("Email verified — you're signed in.");
        toast.success("Email verified");
        emitPartnerPlayerAuthEvent(partnerSlug, "verify");
        setTimeout(() => {
          router.push(json.data?.redirectTo ?? routes.home);
          router.refresh();
        }, 1200);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, partnerSlug, router, routes.home]);

  return (
    <PartnerAuthShell
      partnerSlug={partnerSlug}
      partnerName={partnerName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      formTitle="Verify email"
      formSubtitle={`Confirming your ${partnerName} member account.`}
      footer={
        status === "error" ? (
          <Link href={routes.login} className="font-semibold text-cp-primary hover:underline">
            Back to sign in
          </Link>
        ) : null
      }
    >
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        {status === "loading" || status === "idle" ? (
          <Loader2 className="h-8 w-8 animate-spin text-cp-primary" />
        ) : status === "ok" ? (
          <CheckCircle2 className="h-8 w-8 text-cp-primary" />
        ) : (
          <XCircle className="h-8 w-8 text-destructive" />
        )}
        <p className="text-sm text-cp-muted">{message}</p>
        {status === "error" ? (
          <Button asChild variant="outline" className="mt-2">
            <Link href={routes.checkEmail}>Resend verification</Link>
          </Button>
        ) : null}
      </div>
    </PartnerAuthShell>
  );
}
