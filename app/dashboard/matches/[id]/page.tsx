import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PlayerMatchDetailContent } from "@/components/dashboard/player/competition/player-match-detail-content";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";
import { dashboardRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Match details",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerMatchDetailPage({ params }: PageProps) {
  const { roles } = await requireRoleGuardContext();
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId) || matchId <= 0) notFound();

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading match…" />
          </div>
        }
      >
        <DashboardWorkspaceShell
          roles={roles}
          variant="player"
          title="Match details"
          breadcrumbs={[
            { label: "Player", href: dashboardRoutes.home },
            { label: "Tournaments", href: `${dashboardRoutes.tournaments}?scope=history` },
            { label: "Match" },
          ]}
        >
          <PlayerMatchDetailContent matchId={matchId} />
        </DashboardWorkspaceShell>
      </Suspense>
    </PageShell>
  );
}
