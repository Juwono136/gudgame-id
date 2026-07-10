import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PlayerTournamentsListPage } from "@/components/dashboard/player/competition/player-tournaments-list-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { requireRoleGuardContext } from "@/lib/auth/role-guard";

export const metadata = {
  title: "Tournament History",
  description: "Your complete tournament placement history on Gud Game.",
};

export default async function PlayerTournamentsPage() {
  const { roles } = await requireRoleGuardContext();

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading tournaments…" />
          </div>
        }
      >
        <PlayerTournamentsListPage roles={roles} />
      </Suspense>
    </PageShell>
  );
}
