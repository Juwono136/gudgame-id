import { PageShell } from "@/components/layout/page-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requirePlayerDashboardAccess } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await requirePlayerDashboardAccess();
  const session = await getServerSession();
  if (!session?.user) return null;

  return (
    <PageShell>
      <DashboardShell
        userName={session.user.name}
        userEmail={session.user.email}
        userImage={session.user.image}
      />
    </PageShell>
  );
}
