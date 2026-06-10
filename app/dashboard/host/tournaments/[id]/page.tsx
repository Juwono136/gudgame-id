import { PageShell } from "@/components/layout/page-shell";
import { HostTournamentWorkspace } from "@/components/dashboard/host/host-tournament-workspace";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Tournament #${id}`,
    description: "Host tournament workspace on TandingBase.",
  };
}

export default async function HostTournamentWorkspacePage({ params }: PageProps) {
  await requireHostDashboardAccess();
  const { id } = await params;
  const tournamentId = Number(id);

  return (
    <PageShell showGridBackground={false}>
      <HostTournamentWorkspace tournamentId={tournamentId} />
    </PageShell>
  );
}
