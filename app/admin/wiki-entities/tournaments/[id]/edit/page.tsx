import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { ReclubTournamentWizard } from "@/components/tournaments/reclub/reclub-tournament-wizard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";
import { assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditTournamentPage({ params }: PageProps) {
  const ctx = await requireWikiManagementAccess();
  const tournamentId = parseEntityIdParam((await params).id, "tournament id");

  const tournament = await getTournamentById(tournamentId);
  if (!tournament || tournament.sportId !== ctx.sportId) notFound();

  try {
    assertTournamentEditable(tournament);
  } catch {
    redirect(adminRoutes.wikiEntities);
  }

  const isFunMatch = isFunMatchType(tournament.tournamentType);

  return (
    <AdminShell
      context={ctx}
      title="Edit tournament"
      breadcrumbs={[
        { label: "Wiki Entities", href: adminRoutes.wikiEntities },
        { label: tournament.name },
      ]}
    >
      <p className="text-sm text-cp-muted">{tournament.name}</p>
      <div className="mt-6">
        {isFunMatch ? (
          <ReclubTournamentWizard
            sportSlug={ctx.sportSlug}
            sportName={tournament.sportName}
            initial={tournament}
            tournamentId={tournamentId}
            workspace="admin"
          />
        ) : (
          <TournamentCreateWizard
            sportSlug={ctx.sportSlug}
            initial={tournament}
            tournamentId={tournamentId}
            mode="admin"
          />
        )}
      </div>
    </AdminShell>
  );
}
