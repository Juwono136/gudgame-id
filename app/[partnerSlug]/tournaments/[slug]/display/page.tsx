import { notFound } from "next/navigation";
import { TournamentDisplayClient } from "@/components/tournaments/tournament-display-client";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { listPartnerTournaments } from "@/lib/partners/tournaments";
import { partnerPublicRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
};

export default async function PartnerTournamentDisplayPage({ params }: PageProps) {
  const { partnerSlug, slug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const listed = (await listPartnerTournaments(partner.id)).find((t) => t.slug === slug);
  if (!listed) notFound();

  return (
    <TournamentDisplayClient
      sportSlug={listed.sportSlug}
      slug={slug}
      backHref={partnerPublicRoutes.tournament(partner.slug, slug)}
      partnerLogoUrl={partner.logoUrl}
      partnerName={partner.displayName}
    />
  );
}
