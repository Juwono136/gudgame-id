import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { OfficialRegistrationWizard } from "@/components/tournaments/official-registration-wizard";
import { getServerSession } from "@/lib/auth/session";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getSportBySlug } from "@/lib/wiki/public";
import { getTournamentBySlug } from "@/lib/tournaments/service";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export default async function TournamentRegisterPage({ params }: PageProps) {
  const { sportSlug, slug } = await params;
  const session = await getServerSession();
  if (!session?.user) {
    redirect(
      `${authRoutes.register}?callbackUrl=${encodeURIComponent(publicSportRoutes.tournament(sportSlug, slug))}`,
    );
  }

  const sport = await getSportBySlug(sportSlug);
  if (!sport || sport.visibility !== "live") notFound();

  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.tournamentType !== "official" || tournament.partnerId) {
    notFound();
  }

  return (
    <PageShell>
      <OfficialRegistrationWizard tournament={tournament} />
    </PageShell>
  );
}
