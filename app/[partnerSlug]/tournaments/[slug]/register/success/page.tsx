import { notFound } from "next/navigation";
import { PartnerRegistrationSuccessContent } from "@/components/partners/registration/partner-registration-success-content";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerRegistrationSuccessPage({ params, searchParams }: PageProps) {
  const { partnerSlug, slug } = await params;
  const { token } = await searchParams;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const tournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
  if (!tournament) notFound();

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full">
        <PartnerRegistrationSuccessContent
          partnerSlug={partner.slug}
          tournamentSlug={tournament.slug}
          token={token ?? null}
        />
      </div>
    </div>
  );
}
