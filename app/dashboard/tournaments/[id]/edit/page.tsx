import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { ReclubTournamentWizard } from "@/components/tournaments/reclub/reclub-tournament-wizard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import {
  resolveTournamentEditWorkspace,
  tournamentDeniedRedirect,
  tournamentListUrl,
} from "@/lib/tournaments/edit-routes";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { listPublicSports } from "@/lib/sports/service";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workspace?: string }>;
};

export default async function EditTournamentPage({ params, searchParams }: PageProps) {
  const { userId, roles } = await requireRoleGuardContext();
  const tournamentId = parseEntityIdParam((await params).id, "tournament id");

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) notFound();

  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    redirect(tournamentDeniedRedirect(roles));
  }

  try {
    assertTournamentEditable(tournament);
  } catch {
    redirect(
      tournamentListUrl(
        resolveTournamentEditWorkspace(roles, { tournamentType: tournament.tournamentType }),
      ),
    );
  }

  const sp = await searchParams;
  const workspace = resolveTournamentEditWorkspace(roles, {
    preferHost: sp.workspace === "host",
    tournamentType: tournament.tournamentType,
  });

  if (workspace === "host" && roles.includes("host")) {
    redirect(`/dashboard/host/tournaments/${tournamentId}/edit`);
  }

  const isReclub = tournament.tournamentType === "recreational";
  const sports = await listPublicSports();

  return (
    <PageShell showGridBackground={false}>
      {isReclub ? (
        <ReclubTournamentWizard
          sports={sports.map((s) => ({ slug: s.slug, name: s.name }))}
          defaultSportSlug={tournament.sportSlug}
          initial={tournament}
          tournamentId={tournamentId}
          workspace="player"
        />
      ) : (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Edit tournament</h1>
          <p className="mt-1 text-sm text-cp-muted">{tournament.name}</p>
          <div className="mt-6">
            <TournamentCreateWizard
              sportSlug={tournament.sportSlug}
              initial={tournament}
              tournamentId={tournamentId}
              mode="host"
              workspace="player"
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}
