import { notFound } from "next/navigation";
import { TournamentDisplayClient } from "@/components/tournaments/tournament-display-client";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { resolvePartnerTournamentSportSlug } from "@/lib/partners/tournaments";
import { partnerPublicRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
};

export const metadata = {
  title: "Live Display",
};

/**
 * Full-viewport partner display — parent layout hides partner nav/footer on this route.
 */
export default async function PartnerTournamentDisplayPage({ params }: PageProps) {
  const { partnerSlug, slug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const sportSlug = await resolvePartnerTournamentSportSlug(partner.id, slug);
  if (!sportSlug) notFound();

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <TournamentDisplayClient
        sportSlug={sportSlug}
        slug={slug}
        backHref={partnerPublicRoutes.tournament(partner.slug, slug)}
        partnerLogoUrl={partner.logoUrl}
        partnerName={partner.displayName}
      />
    </div>
  );
}
