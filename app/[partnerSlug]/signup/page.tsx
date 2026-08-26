import { notFound, redirect } from "next/navigation";
import { PartnerSignupForm } from "@/components/partners/auth/partner-signup-form";
import { getPartnerPlayerSessionForSlug } from "@/lib/partners/auth/session";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerSignupPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const existing = await getPartnerPlayerSessionForSlug(partner.slug);
  if (existing) {
    redirect(partnerAuthRoutes(partner.slug).account);
  }

  return (
    <PartnerSignupForm
      partnerSlug={partner.slug}
      partnerName={partner.displayName}
      logoUrl={partner.logoUrl}
      primaryColor={partner.branding.primaryColor ?? "#0d9488"}
    />
  );
}
