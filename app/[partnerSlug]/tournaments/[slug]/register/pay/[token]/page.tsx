import { notFound } from "next/navigation";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerRegistrationPayClient } from "@/components/partners/registration/partner-registration-pay-client";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string; token: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerRegistrationPayPage({ params }: PageProps) {
  const { partnerSlug, slug, token } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const tournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
  if (!tournament) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PartnerPageHeader
        backHref={partnerPublicRoutes.tournament(partner.slug, tournament.slug)}
        backLabel={tournament.name}
        eyebrow={partner.displayName}
        title="Complete your payment"
      />

      <div className="mt-6">
        <PartnerRegistrationPayClient
          partnerSlug={partner.slug}
          tournamentSlug={tournament.slug}
          token={token}
        />
      </div>
    </div>
  );
}
