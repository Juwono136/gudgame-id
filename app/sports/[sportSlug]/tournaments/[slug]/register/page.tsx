import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { OfficialRegistrationWizard } from "@/components/tournaments/official-registration-wizard";
import { getServerSession } from "@/lib/auth/session";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getSportBySlug } from "@/lib/wiki/public";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import {
  getRegistrationSummary,
  getUserRegistrationStatus,
} from "@/lib/tournaments/registration/service";
import { isActiveRegistrationStatus } from "@/lib/tournaments/registration/urls";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export default async function TournamentRegisterPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const session = await getServerSession();
  const tournamentHref = publicSportRoutes.tournament(sportSlug, slug);
  const registerPath = publicSportRoutes.tournamentRegister(sportSlug, slug);

  if (!session?.user) {
    redirect(
      `${authRoutes.login}?callbackUrl=${encodeURIComponent(registerPath)}`,
    );
  }

  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.tournamentType !== "official" || tournament.partnerId) {
    notFound();
  }

  const [summary, regStatus] = await Promise.all([
    getRegistrationSummary(
      tournament.id,
      tournament.maxTeams,
      tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt) : null,
      tournament.registrationOpensAt ? new Date(tournament.registrationOpensAt) : null,
      tournament.startsAt ? new Date(tournament.startsAt) : null,
      tournament.tournamentType,
      tournament.officialBilling,
    ),
    getUserRegistrationStatus(tournament.id, session.user.id),
  ]);

  const holdingSpot =
    isActiveRegistrationStatus(regStatus.status) || regStatus.status === "confirmed";

  if (summary.spotsRemaining === 0 && !holdingSpot) {
    redirect(`${tournamentHref}?full=1`);
  }

  if (regStatus.status === "confirmed") {
    redirect(tournamentHref);
  }
  if (regStatus.status === "awaiting_confirmation" && regStatus.confirmUrl) {
    redirect(regStatus.confirmUrl);
  }
  if (regStatus.status === "pending_payment" && regStatus.checkoutUrl) {
    redirect(regStatus.checkoutUrl);
  }

  const captainDisplayName =
    session.user.name?.trim() || session.user.email?.split("@")[0] || "You";

  return (
    <PageShell>
      <OfficialRegistrationWizard
        tournament={tournament}
        captainDisplayName={captainDisplayName}
      />
    </PageShell>
  );
}
