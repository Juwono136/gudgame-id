import { notFound } from "next/navigation";
import { PartnerRegistrationForm } from "@/components/partners/registration/partner-registration-form";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { getPartnerTournamentCapacity } from "@/lib/partners/registration/service";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerTournamentDetailBySlug } from "@/lib/partners/tournaments";
import { computeRegistrationOpen } from "@/lib/tournaments/status-sync";

type PageProps = {
  params: Promise<{ partnerSlug: string; slug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerTournamentRegisterPage({ params }: PageProps) {
  const { partnerSlug, slug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const tournament = await getPartnerTournamentDetailBySlug(partner.id, slug);
  if (!tournament || tournament.status === "draft") notFound();

  const registrationOpen = computeRegistrationOpen(
    tournament.registrationOpensAt,
    tournament.registrationClosesAt,
    tournament.endsAt ?? tournament.startsAt,
  );

  const capacity = await getPartnerTournamentCapacity(tournament.id, tournament.maxTeams);

  const tournamentHref = partnerPublicRoutes.tournament(partner.slug, tournament.slug);
  const isPaid =
    tournament.officialBilling === "paid" && (tournament.registrationFeeIdr ?? 0) > 0;
  const formatLabel = tournament.format?.replaceAll("_", " ") ?? null;

  const closedMessage = !registrationOpen
    ? "Registration is not currently open for this tournament."
    : capacity.isFull
      ? "This tournament is full — no team spots remaining."
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {closedMessage ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-foreground">
          <p className="font-medium">{tournament.name}</p>
          <p className="mt-2">{closedMessage}</p>
          {capacity.maxTeams != null ? (
            <p className="mt-2 text-cp-muted">
              {capacity.reservedSpots} / {capacity.maxTeams} team spots taken.
            </p>
          ) : null}
        </div>
      ) : (
        <PartnerRegistrationForm
          partnerSlug={partner.slug}
          partnerDisplayName={partner.displayName}
          tournamentSlug={tournament.slug}
          tournamentName={tournament.name}
          playersPerTeam={tournament.playersPerTeam}
          feeIdr={tournament.registrationFeeIdr}
          isPaid={isPaid}
          formatLabel={formatLabel}
          spotsRemaining={capacity.spotsRemaining}
          hubHref={tournamentHref}
        />
      )}
    </div>
  );
}
