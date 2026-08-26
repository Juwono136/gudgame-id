"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { Button } from "@/components/ui/button";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export function PartnerCheckEmailClient({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
}: Props) {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const routes = partnerAuthRoutes(partnerSlug);

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `/api/partner/public/${partnerSlug}/auth/resend-verification`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      if (!res.ok) {
        const json = await res.json();
        toast.error(json?.error?.message ?? "Could not resend");
        return;
      }
      toast.success("Verification email sent");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <PartnerAuthShell
      partnerSlug={partnerSlug}
      partnerName={partnerName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      formTitle="Check your email"
      formSubtitle={`We sent a verification link for your ${partnerName} member account.`}
      footer={
        <Link href={routes.login} className="font-semibold text-cp-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cp-primary/10 text-cp-primary">
          <Mail className="h-5 w-5" />
        </span>
        <p className="text-sm text-cp-muted">
          Open the link in the email to activate your account. You can resend if
          needed.
        </p>
        <AuthInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="text-left"
        />
        <Button
          type="button"
          variant="outline"
          disabled={sending}
          onClick={() => void resend()}
          className="w-full"
        >
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Resend verification email
        </Button>
      </div>
    </PartnerAuthShell>
  );
}
