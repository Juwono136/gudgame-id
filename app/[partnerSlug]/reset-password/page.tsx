import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PartnerResetPasswordForm } from "@/components/partners/auth/partner-reset-password-form";
import { PartnerPageLoader } from "@/components/partners/partner-loading";
import { getActivePartnerBySlug } from "@/lib/partners/service";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerResetPasswordPage({ params }: PageProps) {
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
      <PartnerResetPasswordForm
        partnerSlug={partner.slug}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        primaryColor={partner.branding.primaryColor ?? "#0d9488"}
      />
    </Suspense>
  );
}
