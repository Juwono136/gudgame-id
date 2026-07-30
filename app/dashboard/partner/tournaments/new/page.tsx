import { redirect } from "next/navigation";
import { PartnerTournamentWizard } from "@/components/partners/partner-tournament-wizard";
import { PageShell } from "@/components/layout/page-shell";
import { dashboardRoutes } from "@/lib/constants/routes";
import { requirePartnerWorkspace } from "@/lib/partners/session";

export default async function PartnerNewTournamentPage() {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  return (
    <PageShell showGridBackground={false}>
      <PartnerTournamentWizard
        partnerSlug={workspace.partner.slug}
        sportSlug="padel"
        mode="create"
      />
    </PageShell>
  );
}
