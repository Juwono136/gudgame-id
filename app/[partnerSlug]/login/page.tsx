import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PartnerLoginForm } from "@/components/partners/auth/partner-login-form";
import { PartnerPageLoader } from "@/components/partners/partner-loading";
import { getPartnerPlayerSessionForSlug } from "@/lib/partners/auth/session";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerLoginPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const existing = await getPartnerPlayerSessionForSlug(partner.slug);
  if (existing) {
    redirect(partnerAuthRoutes(partner.slug).account);
  }

  const primary = partner.branding.primaryColor ?? "#0d9488";

  return (
    <Suspense fallback={<PartnerPageLoader />}>
      <PartnerLoginForm
        partnerSlug={partner.slug}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        primaryColor={primary}
      />
    </Suspense>
  );
}
