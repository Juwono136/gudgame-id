import { notFound } from "next/navigation";
import { PartnerForgotPasswordForm } from "@/components/partners/auth/partner-forgot-password-form";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerForgotPasswordPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  return (
    <PartnerForgotPasswordForm
      partnerSlug={partner.slug}
      partnerName={partner.displayName}
      logoUrl={partner.logoUrl}
      primaryColor={partner.branding.primaryColor ?? "#0d9488"}
    />
  );
}
