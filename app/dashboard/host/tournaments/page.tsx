import { PageShell } from "@/components/layout/page-shell";
import { HostTournamentsHub } from "@/components/dashboard/host/host-tournaments-hub";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Host Tournaments",
  description: "Manage official and reclub tournaments you host on TandingBase.",
};

export default async function HostTournamentsPage() {
  const { roles } = await requireHostDashboardAccess();

  return (
    <PageShell showGridBackground={false}>
      <HostTournamentsHub roles={roles} />
    </PageShell>
  );
}
