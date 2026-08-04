"use client";

import { TournamentDiscoveryCard } from "@/components/tournaments/tournament-discovery-card";
import { usePartnerRegistrationStatus } from "@/hooks/use-partner-registration-status";
import { useRegistrationStatus } from "@/hooks/use-registration-status";
import {
  isActiveRegistrationStatus,
  resolveTournamentDiscoveryCta,
} from "@/lib/tournaments/discovery-cta";
import type { TournamentListItem } from "@/lib/tournaments/service";

/**
 * Public list card:
 * - Join → register when the viewer is not registered
 * - Bracket when already registered (or event completed)
 */
export function TournamentDiscoveryPublicCard({
  tournament,
  detailHref,
  registerHref,
  partnerSlug,
  priority = false,
}: {
  tournament: TournamentListItem;
  detailHref: string;
  registerHref: string;
  /** When set, uses partner guest-registration status (email / team) instead of Gud Game official. */
  partnerSlug?: string;
  priority?: boolean;
}) {
  const isPartner = Boolean(partnerSlug);
  const sportReg = useRegistrationStatus(
    tournament.sportSlug,
    tournament.slug,
    !isPartner,
  );
  const partnerReg = usePartnerRegistrationStatus(
    partnerSlug,
    tournament.slug,
    isPartner,
  );

  const isRegistered = isPartner
    ? Boolean(partnerReg.data?.isRegistered)
    : isActiveRegistrationStatus(sportReg.data?.status);

  const cta = resolveTournamentDiscoveryCta({
    status: tournament.status,
    detailHref,
    registerHref,
    isRegistered,
  });

  return (
    <TournamentDiscoveryCard
      tournament={tournament}
      href={detailHref}
      cta={cta}
      priority={priority}
    />
  );
}
