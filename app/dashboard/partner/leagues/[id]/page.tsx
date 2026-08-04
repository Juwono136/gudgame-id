import { notFound, redirect } from "next/navigation";
import { PartnerLeagueManageClient } from "@/components/partners/partner-league-manage-client";
import { dashboardRoutes } from "@/lib/constants/routes";
import { getPartnerLeagueById } from "@/lib/partners/leagues";
import { requirePartnerWorkspace } from "@/lib/partners/session";
import { queryPartnerTournamentsForLeague } from "@/lib/partners/tournaments";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerLeagueManagePage({ params }: PageProps) {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  const { id } = await params;
  const league = await getPartnerLeagueById(workspace.partner.id, id);
  if (!league) notFound();

  const tournamentPage = await queryPartnerTournamentsForLeague(
    workspace.partner.id,
    league.id,
    { page: 1, limit: DEFAULT_PAGE_SIZE },
  );

  return (
    <PartnerLeagueManageClient
      leagueId={league.id}
      partnerSlug={workspace.partner.slug}
      initialLeague={league}
      initialTournaments={tournamentPage.items}
      initialTournamentTotal={tournamentPage.total}
      primaryColor={workspace.partner.branding.primaryColor ?? "#0d9488"}
      accentColor={workspace.partner.branding.accentColor ?? "#14b8a6"}
    />
  );
}
