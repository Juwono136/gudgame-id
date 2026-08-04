"use client";

import Link from "next/link";
import { FadeInView } from "@/components/motion/fade-in";
import { DirectoryViewToggle } from "@/components/partners/directory-view-toggle";
import { PartnerTournamentPublicListRow } from "@/components/partners/partner-tournament-public-list-row";
import { TournamentDiscoveryPublicCard } from "@/components/tournaments/tournament-discovery-public-card";
import { useDirectoryViewMode } from "@/hooks/use-directory-view-mode";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import type { TournamentListItem } from "@/lib/tournaments/service";

type Bucket = {
  title: string;
  description: string;
  emptyMessage: string;
  tournaments: TournamentListItem[];
};

export function PartnerHomeTournamentSections({
  partnerSlug,
  viewAllHref,
  live,
  upcoming,
  completed,
}: {
  partnerSlug: string;
  viewAllHref: string;
  live: TournamentListItem[];
  upcoming: TournamentListItem[];
  completed: TournamentListItem[];
}) {
  const [viewMode, setViewMode] = useDirectoryViewMode("partner-home-tournaments");

  const buckets: Bucket[] = [
    {
      title: "Live tournaments",
      description: "Events happening right now",
      emptyMessage: "No live tournaments right now.",
      tournaments: live,
    },
    {
      title: "Upcoming tournaments",
      description: "Registration and fixtures ahead",
      emptyMessage: "No upcoming tournaments yet.",
      tournaments: upcoming,
    },
    {
      title: "Completed tournaments",
      description: "Past results on this partner site",
      emptyMessage: "No completed tournaments yet.",
      tournaments: completed,
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="flex justify-end">
        <DirectoryViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {buckets.map((bucket) => (
        <FadeInView key={bucket.title}>
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                  {bucket.title}
                </h2>
                <p className="mt-1 text-xs text-cp-muted sm:text-sm">{bucket.description}</p>
              </div>
              <Link
                href={viewAllHref}
                className="shrink-0 text-xs font-medium text-cp-primary hover:underline sm:text-sm"
              >
                View all
              </Link>
            </div>

            {bucket.tournaments.length === 0 ? (
              <div className="overflow-hidden rounded-2xl border border-dashed border-cp-border bg-cp-card/50 px-4 py-10 text-center text-sm text-cp-muted">
                {bucket.emptyMessage}
              </div>
            ) : viewMode === "list" ? (
              <ul className="space-y-2.5 sm:space-y-3">
                {bucket.tournaments.map((t) => (
                  <PartnerTournamentPublicListRow
                    key={t.id}
                    tournament={t}
                    partnerSlug={partnerSlug}
                  />
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {bucket.tournaments.map((t, index) => (
                  <TournamentDiscoveryPublicCard
                    key={t.id}
                    tournament={t}
                    detailHref={partnerPublicRoutes.tournament(partnerSlug, t.slug)}
                    registerHref={partnerPublicRoutes.tournamentRegister(partnerSlug, t.slug)}
                    partnerSlug={partnerSlug}
                    priority={index === 0}
                  />
                ))}
              </div>
            )}
          </section>
        </FadeInView>
      ))}
    </div>
  );
}
