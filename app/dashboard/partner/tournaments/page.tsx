import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerTournamentsDirectory } from "@/components/partners/partner-tournaments-directory";
import { Button } from "@/components/ui/button";
import { dashboardRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";
import { requirePartnerWorkspace } from "@/lib/partners/session";

export default async function PartnerTournamentsPage() {
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
        title="Tournaments"
        description="Run knockout, group stage, and Americano formats with live or paper scoring, and brackets."
        actions={
          <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
            <Link href={dashboardRoutes.partnerTournamentsNew}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              New tournament
            </Link>
          </Button>
        }
      />

      <PartnerTournamentsDirectory mode="dashboard" partnerSlug={partnerSlug} />
    </div>
  );
}
