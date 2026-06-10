import { cookies } from "next/headers";
import { PageShell } from "@/components/layout/page-shell";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { ADMIN_SPORT_COOKIE } from "@/lib/roles/constants";

export const metadata = {
  title: "Create Tournament",
  description: "Create an official or reclub tournament as a host on TandingBase.",
};

export default async function HostCreateTournamentPage() {
  await requireHostDashboardAccess();
  const cookieStore = await cookies();
  const sportSlug = cookieStore.get(ADMIN_SPORT_COOKIE)?.value ?? "padel";

  return (
    <PageShell showGridBackground={false}>
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <TournamentCreateWizard sportSlug={sportSlug} mode="host" />
      </div>
    </PageShell>
  );
}
