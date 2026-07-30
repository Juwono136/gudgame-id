import { notFound } from "next/navigation";
import { PartnerRegistrationReceiptContent } from "@/components/partners/registration/partner-registration-receipt-content";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment receipt",
};

export default async function PartnerRegistrationReceiptPage({ params, searchParams }: PageProps) {
  const { partnerSlug, slug } = await params;
  const { token } = await searchParams;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const tournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
  if (!tournament) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PartnerRegistrationReceiptContent
        partnerSlug={partner.slug}
        tournamentSlug={tournament.slug}
        tournamentUrl={partnerPublicRoutes.tournament(partner.slug, tournament.slug)}
        token={token ?? null}
      />
    </div>
  );
}
