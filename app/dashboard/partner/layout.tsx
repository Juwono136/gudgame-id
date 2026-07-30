import { PartnerDashboardShell } from "@/components/partners/partner-dashboard-shell";
import { requirePartnerDashboardAccess } from "@/lib/auth/role-guard";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";

export default async function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePartnerDashboardAccess();
  const partner = await getPrimaryPartnerForUser(ctx.userId);

  if (!partner || !partner.isActive) {
    return children;
  }

  return <PartnerDashboardShell partner={partner}>{children}</PartnerDashboardShell>;
}
