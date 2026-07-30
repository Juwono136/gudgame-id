import { notFound, redirect } from "next/navigation";
import { PartnerLeagueManageClient } from "@/components/partners/partner-league-manage-client";
import { dashboardRoutes } from "@/lib/constants/routes";
import { getPartnerLeagueById } from "@/lib/partners/leagues";
import { requirePartnerWorkspace } from "@/lib/partners/session";

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

  return (
    <PartnerLeagueManageClient
      leagueId={league.id}
      partnerSlug={workspace.partner.slug}
      initialLeague={league}
    />
  );
}
