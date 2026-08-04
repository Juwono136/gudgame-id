"use client";

import { TournamentDiscoveryCard } from "@/components/tournaments/tournament-discovery-card";
import { useRegistrationStatus } from "@/hooks/use-registration-status";
import {
  isActiveRegistrationStatus,
  resolveTournamentDiscoveryCta,
} from "@/lib/tournaments/discovery-cta";
import type { TournamentListItem } from "@/lib/tournaments/service";

/**
 * Public list card with Join → register, or Bracket when already registered / live / completed.
 */
export function TournamentDiscoveryPublicCard({
  tournament,
  detailHref,
  registerHref,
}: {
  tournament: TournamentListItem;
  detailHref: string;
  registerHref: string;
}) {
  const { data } = useRegistrationStatus(tournament.sportSlug, tournament.slug, true);
  const isRegistered = isActiveRegistrationStatus(data?.status);
  const cta = resolveTournamentDiscoveryCta({
    status: tournament.status,
    detailHref,
    registerHref,
    isRegistered,
  });

  return (
    <TournamentDiscoveryCard tournament={tournament} href={detailHref} cta={cta} />
  );
}
