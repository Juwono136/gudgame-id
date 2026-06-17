import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { dashboardRoutes } from "@/lib/constants/routes";
import { assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { tournamentListUrl } from "@/lib/tournaments/edit-routes";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HostEditTournamentPage({ params }: PageProps) {
  const { userId, roles } = await requireHostDashboardAccess();
  const tournamentId = Number((await params).id);
  if (!Number.isFinite(tournamentId) || tournamentId <= 0) notFound();

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    redirect(tournamentListUrl("host"));
  }

  try {
    assertTournamentEditable(tournament);
  } catch {
    redirect(dashboardRoutes.hostTournaments);
  }

  return (
    <PageShell showGridBackground={false}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={dashboardRoutes.hostTournaments}
          className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          My tournaments
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Edit tournament</h1>
        <p className="mt-1 text-sm text-cp-muted">{tournament.name}</p>
        <div className="mt-6">
          <TournamentCreateWizard
            sportSlug={tournament.sportSlug}
            initial={tournament}
            tournamentId={tournamentId}
            mode="host"
            workspace="host"
          />
        </div>
      </div>
    </PageShell>
  );
}
