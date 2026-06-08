import { PageShell } from "@/components/layout/page-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProfileCompletionSection } from "@/components/dashboard/profile-completion-section";
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
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
        <ProfileCompletionSection />
      </div>
      <DashboardShell
        userName={session.user.name}
        userEmail={session.user.email}
        userImage={session.user.image}
      />
    </PageShell>
  );
}
