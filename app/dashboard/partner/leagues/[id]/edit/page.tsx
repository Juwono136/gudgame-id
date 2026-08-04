import { notFound, redirect } from "next/navigation";
import { PartnerLeagueEditClient } from "@/components/partners/partner-league-edit-client";
import { dashboardRoutes } from "@/lib/constants/routes";
import { getPartnerLeagueById } from "@/lib/partners/leagues";
import { requirePartnerWorkspace } from "@/lib/partners/session";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerLeagueEditPage({ params }: PageProps) {
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
    <PartnerLeagueEditClient
      league={league}
      primaryColor={workspace.partner.branding.primaryColor ?? "#0d9488"}
      accentColor={workspace.partner.branding.accentColor ?? "#14b8a6"}
    />
  );
}
