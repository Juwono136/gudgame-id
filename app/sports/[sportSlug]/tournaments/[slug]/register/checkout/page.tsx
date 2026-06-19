import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { RegistrationCheckoutClient } from "@/components/tournaments/registration-checkout-client";
import { isUuid, parseEntityIdParam } from "@/lib/domain/uuid";
import { getServerSession } from "@/lib/auth/session";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getUserRegistrationStatus } from "@/lib/tournaments/registration/service";
import { expireRegistrationIfOverdue } from "@/lib/tournaments/registration/payment-expiry";
import { getSportBySlug } from "@/lib/wiki/public";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
  searchParams: Promise<{ registrationId?: string }>;
};

export default async function TournamentRegisterCheckoutPage({
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
      `${authRoutes.login}?callbackUrl=${encodeURIComponent(publicSportRoutes.tournament(sportSlug, slug) + `/register/checkout?registrationId=${registrationId}`)}`,
    );
  }

  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.tournamentType !== "official") notFound();

  const status = await getUserRegistrationStatus(tournament.id, session.user.id);
  if (status.registrationId !== registrationId) notFound();

  await expireRegistrationIfOverdue(registrationId);
  const refreshed = await getUserRegistrationStatus(tournament.id, session.user.id);

  if (refreshed.status === "cancelled" || refreshed.status === "declined") {
    redirect(publicSportRoutes.tournament(sportSlug, slug) + "/register");
  }

  if (refreshed.status === "awaiting_confirmation" && refreshed.confirmUrl) {
    redirect(refreshed.confirmUrl);
  }

  return (
    <PageShell>
      <RegistrationCheckoutClient tournament={tournament} registrationId={registrationId} />
    </PageShell>
  );
}
