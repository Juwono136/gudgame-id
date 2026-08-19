import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { ReclubTournamentWizard } from "@/components/tournaments/reclub/reclub-tournament-wizard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { canEditTournament } from "@/lib/tournaments/manage-policy";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { tournamentListUrl } from "@/lib/tournaments/edit-routes";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import { getTournamentById } from "@/lib/tournaments/workspace/service";
import { TournamentEditLockedBanner } from "@/components/tournaments/tournament-edit-locked-banner";

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

  const readOnly = !canEditTournament(tournament.status);
  const isFunMatch = isFunMatchType(tournament.tournamentType);
  const publicHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);

  return (
    <PageShell showGridBackground={false}>
      {isFunMatch ? (
        <ReclubTournamentWizard
          initial={tournament}
          tournamentId={tournamentId}
          workspace="host"
          backHref="/dashboard/host/tournaments"
          backLabel="My tournaments"
          readOnly={readOnly}
        />
      ) : (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href={dashboardRoutes.hostTournaments}
            className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            My tournaments
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-3xl">
            {readOnly ? "View tournament" : "Edit tournament"}
          </h1>
          <p className="mt-1 text-sm text-cp-muted">{tournament.name}</p>
          {readOnly ? (
            <div className="mt-6">
              <TournamentEditLockedBanner status={tournament.status} publicHref={publicHref} />
            </div>
          ) : null}
          <div className={readOnly ? "mt-2" : "mt-6"}>
            <TournamentCreateWizard
              sportSlug={tournament.sportSlug}
              initial={tournament}
              tournamentId={tournamentId}
              mode="host"
              workspace="host"
              showTopBack={false}
              readOnly={readOnly}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}
