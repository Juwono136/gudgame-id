import { redirect } from "next/navigation";
import { PartnerTournamentWizard } from "@/components/partners/partner-tournament-wizard";
import { dashboardRoutes } from "@/lib/constants/routes";
import { getPartnerLeagueById } from "@/lib/partners/leagues";
import { isPartnerLeagueLinkable } from "@/lib/partners/league-types";
import { requirePartnerWorkspace } from "@/lib/partners/session";

type PageProps = {
  searchParams: Promise<{ leagueId?: string }>;
};

export default async function PartnerNewTournamentPage({ searchParams }: PageProps) {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  const { leagueId: rawLeagueId } = await searchParams;
  let defaultPartnerLeagueId: string | null = null;
  let defaultPartnerLeagueName: string | null = null;

  if (rawLeagueId?.trim()) {
    const league = await getPartnerLeagueById(workspace.partner.id, rawLeagueId.trim());
    if (league && isPartnerLeagueLinkable(league.status)) {
      defaultPartnerLeagueId = league.id;
      defaultPartnerLeagueName = league.name;
    }
  }

  return (
    <PartnerTournamentWizard
      partnerSlug={workspace.partner.slug}
      sportSlug="padel"
      mode="create"
      defaultPartnerLeagueId={defaultPartnerLeagueId}
      defaultPartnerLeagueName={defaultPartnerLeagueName}
    />
  );
}
