import { PageShell } from "@/components/layout/page-shell";
import { HostCreateTournamentClient } from "@/components/dashboard/host/host-create-tournament-client";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { listPublicSports } from "@/lib/sports/service";

export const metadata = {
  title: "Create Tournament",
  description: "Create an official tournament or Fun Match as a host on TandingBase.",
};

export default async function HostCreateTournamentPage() {
  await requireHostDashboardAccess();
  const sports = await listPublicSports();

  return (
    <PageShell showGridBackground={false}>
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <HostCreateTournamentClient
          defaultSportSlug={sports[0]?.slug ?? "padel"}
          sports={sports.map((s) => ({ slug: s.slug, name: s.name }))}
        />
      </div>
    </PageShell>
  );
}
