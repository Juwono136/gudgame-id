import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerTournamentsDirectory } from "@/components/partners/partner-tournaments-directory";
import { PageShell } from "@/components/layout/page-shell";
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
    <PageShell showGridBackground={false}>
      <div className={partnerPageClass("space-y-5 py-8")}>
        <PartnerPageHeader
          backHref={dashboardRoutes.partner}
          backLabel="Partner dashboard"
          title="Tournaments"
          description="Event-day formats (knockout, group stage, Americano) with live or paper scoring, brackets, and optional venue TV — never listed on Gud Game."
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
    </PageShell>
  );
}
