"use client";

import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { usePartnerRegistrationStatus } from "@/hooks/use-partner-registration-status";
import { resolveTournamentDiscoveryCta } from "@/lib/tournaments/discovery-cta";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { partnerPublicRoutes } from "@/lib/constants/routes";

/** Public partner list row with Join / Bracket CTA. */
export function PartnerTournamentPublicListRow({
  tournament,
  partnerSlug,
  hideLeagueBadge = false,
}: {
  tournament: TournamentListItem;
  partnerSlug: string;
  /** Hide league badge when already viewing that league. */
  hideLeagueBadge?: boolean;
}) {
  const detailHref = partnerPublicRoutes.tournament(partnerSlug, tournament.slug);
  const registerHref = partnerPublicRoutes.tournamentRegister(partnerSlug, tournament.slug);
  const leagueHref =
    !hideLeagueBadge && tournament.partnerLeagueSlug?.trim()
      ? partnerPublicRoutes.league(partnerSlug, tournament.partnerLeagueSlug)
      : undefined;
  const { data } = usePartnerRegistrationStatus(partnerSlug, tournament.slug, true);

  const cta = resolveTournamentDiscoveryCta({
    status: tournament.status,
    detailHref,
    registerHref,
    isRegistered: Boolean(data?.isRegistered),
  });

  return (
    <PartnerTournamentRow
      tournament={tournament}
      href={detailHref}
      leagueHref={leagueHref}
      hideLeagueBadge={hideLeagueBadge}
      cta={cta}
    />
  );
}
