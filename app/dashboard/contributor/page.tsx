import { PageShell } from "@/components/layout/page-shell";
import { ContributorDashboard } from "@/components/dashboard/contributor-dashboard";
import { requireContributorDashboardAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Contributor Dashboard",
};

export default async function ContributorDashboardPage() {
  const { roles } = await requireContributorDashboardAccess();
  const session = await getServerSession();
  if (!session?.user) return null;

  return (
    <PageShell>
      <ContributorDashboard
        userName={session.user.name}
        userEmail={session.user.email}
        roles={roles}
      />
    </PageShell>
  );
}
