import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { RegistrationConfirmClient } from "@/components/tournaments/registration-confirm-client";
import { isUuid, parseEntityIdParam } from "@/lib/domain/uuid";
import { getServerSession } from "@/lib/auth/session";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getUserRegistrationStatus } from "@/lib/tournaments/registration/service";
import { getSportBySlug } from "@/lib/wiki/public";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
  searchParams: Promise<{ registrationId?: string }>;
};

export default async function TournamentRegisterConfirmPage({
  params,
  searchParams,
}: PageProps) {
  const { sportSlug, slug } = await params;
  const { registrationId: regIdRaw } = await searchParams;
  if (!regIdRaw?.trim() || !isUuid(regIdRaw.trim())) {
    redirect(publicSportRoutes.tournament(sportSlug, slug) + "/register");
  }
  const registrationId = parseEntityIdParam(regIdRaw, "registration id");

  const session = await getServerSession();
  if (!session?.user) {
    redirect(
      `${authRoutes.login}?callbackUrl=${encodeURIComponent(publicSportRoutes.tournament(sportSlug, slug) + `/register/confirm?registrationId=${registrationId}`)}`,
    );
  }

  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.tournamentType !== "official" || tournament.partnerId) {
    notFound();
  }

  const status = await getUserRegistrationStatus(tournament.id, session.user.id);
  if (status.registrationId !== registrationId) notFound();

  if (status.status === "pending_payment" && status.checkoutUrl) {
    redirect(status.checkoutUrl);
  }
  if (status.status === "confirmed") {
    redirect(publicSportRoutes.tournament(sportSlug, slug));
  }

  return (
    <PageShell>
      <RegistrationConfirmClient
        tournament={tournament}
        registrationId={registrationId}
        teamName={status.teamName ?? "Team"}
        teamMembers={status.teamMembers}
      />
    </PageShell>
  );
}
