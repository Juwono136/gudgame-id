import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PartnerCheckEmailClient } from "@/components/partners/auth/partner-check-email-client";
import { PartnerPageLoader } from "@/components/partners/partner-loading";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerCheckEmailPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <PartnerPageLoader />
        </div>
      }
    >
      <PartnerCheckEmailClient
        partnerSlug={partner.slug}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        primaryColor={partner.branding.primaryColor ?? "#0d9488"}
      />
    </Suspense>
  );
}
