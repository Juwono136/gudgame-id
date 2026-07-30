import { notFound, redirect } from "next/navigation";
import { PartnerTournamentWizard } from "@/components/partners/partner-tournament-wizard";
import { PageShell } from "@/components/layout/page-shell";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { dashboardRoutes } from "@/lib/constants/routes";
import { requirePartnerWorkspace } from "@/lib/partners/session";
import { toPartnerFunMatchTournament } from "@/lib/partners/tournament-surface";
import { assertTournamentEditable } from "@/lib/tournaments/manage-policy";
import { getTournamentById } from "@/lib/tournaments/workspace/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PartnerEditTournamentPage({ params }: PageProps) {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  let tournamentId: string;
  try {
    tournamentId = parseEntityIdParam((await params).id, "tournament id");
  } catch {
    notFound();
  }

  const rawTournament = await getTournamentById(tournamentId);
  if (!rawTournament || rawTournament.partnerId !== workspace.partner.id) {
    notFound();
  }
  const tournament = toPartnerFunMatchTournament(rawTournament);

  try {
    assertTournamentEditable(tournament);
  } catch {
    redirect(dashboardRoutes.partnerTournaments);
  }

  return (
    <PageShell showGridBackground={false}>
      <PartnerTournamentWizard
        partnerSlug={workspace.partner.slug}
        sportSlug={tournament.sportSlug || "padel"}
        mode="edit"
        initial={tournament}
        tournamentId={tournamentId}
      />
    </PageShell>
  );
}
