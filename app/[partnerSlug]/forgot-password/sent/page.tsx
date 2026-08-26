import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ email?: string }>;
};

export default async function PartnerForgotPasswordSentPage({
  params,
  searchParams,
}: PageProps) {
  const { partnerSlug } = await params;
  const { email } = await searchParams;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();
  const routes = partnerAuthRoutes(partner.slug);

  return (
    <PartnerAuthShell
      partnerSlug={partner.slug}
      partnerName={partner.displayName}
      logoUrl={partner.logoUrl}
      primaryColor={partner.branding.primaryColor ?? "#0d9488"}
      formTitle="Check your inbox"
      formSubtitle={
        email
          ? `If an account exists for ${email} at ${partner.displayName}, we sent a reset link.`
          : `If an account exists for that email at ${partner.displayName}, we sent a reset link.`
      }
      footer={
        <Link href={routes.login} className="font-semibold text-cp-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cp-primary/10 text-cp-primary">
          <Mail className="h-5 w-5" />
        </span>
        <p className="text-sm text-cp-muted">
          The link expires in one hour. Check spam if you don&apos;t see it.
        </p>
      </div>
    </PartnerAuthShell>
  );
}
