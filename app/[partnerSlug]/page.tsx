import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Radio, Trophy } from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerHomeTournamentSections } from "@/components/partners/partner-home-tournament-sections";
import { PartnerLandingHero } from "@/components/partners/partner-landing-hero";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { countPartnerLeagues } from "@/lib/partners/leagues";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import {
  countPartnerTournaments,
  listPartnerTournamentTeasers,
} from "@/lib/partners/tournaments";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerLandingPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const [live, upcoming, completed, tournamentTotal, leagueTotal, activeCount] =
    await Promise.all([
      listPartnerTournamentTeasers(partner.id, { limit: 6, status: "live" }),
      listPartnerTournamentTeasers(partner.id, { limit: 6, status: "upcoming" }),
      listPartnerTournamentTeasers(partner.id, { limit: 6, status: "completed" }),
      countPartnerTournaments(partner.id, "all", { excludeDrafts: true }),
      countPartnerLeagues(partner.id, "public"),
      countPartnerTournaments(partner.id, "active"),
    ]);
  const primary = partner.branding.primaryColor ?? "#0d9488";
  const tournamentsHref = partnerPublicRoutes.tournaments(partner.slug);

  const stats = [
    { icon: CalendarDays, label: "Tournaments", shortLabel: "Events", value: tournamentTotal },
    { icon: Radio, label: "Live / upcoming", shortLabel: "Active", value: activeCount },
    { icon: Trophy, label: "Leagues", shortLabel: "Leagues", value: leagueTotal },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
      <FadeInView>
        <PartnerLandingHero
          displayName={partner.displayName}
          slug={partner.slug}
          logoUrl={partner.logoUrl}
          primaryColor={primary}
          accentColor={partner.branding.accentColor ?? "#14b8a6"}
          heroTitle={partner.branding.heroTitle}
          tagline={partner.branding.tagline}
          about={partner.branding.about}
          contactEmail={partner.branding.contactEmail}
          contactWhatsapp={partner.branding.contactWhatsapp}
          contactWebsite={partner.branding.contactWebsite}
          stats={stats}
        />
      </FadeInView>

      <div className="mt-8 space-y-10 sm:mt-12 sm:space-y-12">
        {live.length === 0 && upcoming.length === 0 && completed.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-dashed border-cp-border bg-cp-card/50">
            <PartnerEmptyState
              title="No events yet"
              description="Published tournaments will appear here as live, upcoming, and completed."
            />
          </div>
        ) : (
          <PartnerHomeTournamentSections
            partnerSlug={partner.slug}
            viewAllHref={tournamentsHref}
            live={live}
            upcoming={upcoming}
            completed={completed}
          />
        )}
      </div>
    </div>
  );
}
