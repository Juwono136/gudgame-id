import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PlayerMatchesListPage } from "@/components/dashboard/player/competition/player-matches-list-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Match History",
  description: "Your complete tournament match history on TandingBase.",
};

export default async function PlayerMatchesPage() {
  const { roles } = await requireRoleGuardContext();

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading matches…" />
          </div>
        }
      >
        <PlayerMatchesListPage roles={roles} />
      </Suspense>
    </PageShell>
  );
}
