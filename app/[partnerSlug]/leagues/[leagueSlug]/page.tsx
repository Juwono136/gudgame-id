import { notFound } from "next/navigation";
import { PartnerLeagueBanner } from "@/components/partners/partner-league-banner";
import { PartnerLeagueHistorySection } from "@/components/partners/partner-league-history-section";
import { PartnerLeagueStandingsSection } from "@/components/partners/partner-league-standings-section";
import { PartnerLeagueTournamentsSection } from "@/components/partners/partner-league-tournaments-section";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { getPartnerLeagueBySlug } from "@/lib/partners/leagues";
import { partnerPageClass } from "@/lib/partners/layout";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { queryPartnerTournamentsForLeague } from "@/lib/partners/tournaments";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";

type PageProps = {
  params: Promise<{ partnerSlug: string; leagueSlug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerPublicLeagueDetailPage({ params }: PageProps) {
  const { partnerSlug, leagueSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const league = await getPartnerLeagueBySlug(partner.id, leagueSlug);
  if (!league || league.status === "draft" || league.status === "archived") notFound();

  const tournamentPage = await queryPartnerTournamentsForLeague(partner.id, league.id, {
    excludeDrafts: true,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });

  const primary = partner.branding.primaryColor ?? "#0d9488";
  const accent = partner.branding.accentColor ?? primary;

  return (
    <div className={partnerPageClass("space-y-6 py-8 sm:space-y-8 sm:py-10")}>
      <PartnerLeagueBanner
        league={league}
        backHref={partnerPublicRoutes.leagues(partner.slug)}
        backLabel="Leagues"
        tournamentCount={tournamentPage.total}
        primaryColor={primary}
        accentColor={accent}
      />

      <PartnerLeagueTournamentsSection
        partnerSlug={partner.slug}
        leagueId={league.id}
        leagueName={league.name}
        mode="public"
        initialItems={tournamentPage.items}
        initialTotal={tournamentPage.total}
      />

      <PartnerLeagueStandingsSection standings={league.standings} />

      <PartnerLeagueHistorySection matches={league.matches} mode="public" />
    </div>
  );
}
