import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { tournamentListUrl } from "@/lib/tournaments/edit-routes";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HostEditTournamentPage({ params }: PageProps) {
  const { userId, roles } = await requireHostDashboardAccess();
  const tournamentId = parseEntityIdParam((await params).id, "tournament id");

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    redirect(tournamentListUrl("host"));
  }

  try {
    assertTournamentEditable(tournament);
  } catch {
    redirect(tournamentListUrl("host"));
  }

  return (
    <PageShell showGridBackground={false}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Edit tournament</h1>
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
