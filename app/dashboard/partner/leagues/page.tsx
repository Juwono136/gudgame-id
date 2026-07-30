import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerLeaguesDirectory } from "@/components/partners/partner-leagues-directory";
import { Button } from "@/components/ui/button";
import { dashboardRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";
import { requirePartnerWorkspace } from "@/lib/partners/session";

export default async function PartnerLeaguesPage() {
  let workspace;
  try {
    workspace = await requirePartnerWorkspace();
  } catch {
    redirect(dashboardRoutes.partner);
  }

  const partnerSlug = workspace.partner.slug;

  return (
    <div className={partnerPageClass("space-y-5 py-8")}>
      <PartnerPageHeader
        backHref={dashboardRoutes.partner}
        backLabel="Partner dashboard"
        title="Leagues"
        description="Season-long competitions with manual score entry and rolling standings on your site."
        actions={
          <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
            <Link href={dashboardRoutes.partnerLeaguesNew}>
              <Plus className="mr-2 h-4 w-4" />
              New league
            </Link>
          </Button>
        }
      />

      <PartnerLeaguesDirectory mode="dashboard" partnerSlug={partnerSlug} />
    </div>
  );
}
