import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { PartnerAccountClient } from "@/components/partners/auth/partner-account-client";
import { getPartnerPlayerSessionForSlug } from "@/lib/partners/auth/session";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerAccountPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const resolved = await getPartnerPlayerSessionForSlug(partner.slug);
  if (!resolved) {
    redirect(
      `${partnerAuthRoutes(partner.slug).login}?callbackUrl=${encodeURIComponent(
        partnerAuthRoutes(partner.slug).account,
      )}`,
    );
  }

  return (
    <PartnerAccountClient
      partnerSlug={partner.slug}
      partnerName={partner.displayName}
      logoUrl={partner.logoUrl}
      primaryColor={partner.branding.primaryColor ?? "#0d9488"}
      session={resolved.session}
    />
  );
}
