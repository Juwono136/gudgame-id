import { notFound } from "next/navigation";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerRegistrationForm } from "@/components/partners/registration/partner-registration-form";
import { partnerPublicRoutes } from "@/lib/constants/routes";
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
    tournament.startsAt,
  );

  const tournamentHref = partnerPublicRoutes.tournament(partner.slug, tournament.slug);
  const isPaid =
    tournament.officialBilling === "paid" && (tournament.registrationFeeIdr ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PartnerPageHeader
        backHref={tournamentHref}
        backLabel={tournament.name}
        eyebrow={partner.displayName}
        title="Register your team"
        description={`${tournament.sportName}${tournament.venue ? ` · ${tournament.venue}` : ""}`}
      />

      <div className="mt-6">
        {!registrationOpen ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-foreground">
            Registration is not currently open for this tournament.
          </div>
        ) : (
          <PartnerRegistrationForm
            partnerSlug={partner.slug}
            tournamentSlug={tournament.slug}
            tournamentName={tournament.name}
            playersPerTeam={tournament.playersPerTeam}
            feeIdr={tournament.registrationFeeIdr}
            isPaid={isPaid}
          />
        )}
      </div>
    </div>
  );
}
