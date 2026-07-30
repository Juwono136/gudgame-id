import { notFound } from "next/navigation";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { PartnerLeagueMatchesPanel } from "@/components/partners/partner-league-matches-panel";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerLeagueBySlug } from "@/lib/partners/leagues";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { alertPanelClass } from "@/lib/styles/status-badges";

type PageProps = {
  params: Promise<{ partnerSlug: string; leagueSlug: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PartnerPublicLeagueDetailPage({ params }: PageProps) {
  const { partnerSlug, leagueSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const league = await getPartnerLeagueBySlug(partner.id, leagueSlug);
  if (!league || league.status === "draft" || league.status === "archived") notFound();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <PartnerPageHeader
        backHref={partnerPublicRoutes.leagues(partner.slug)}
        backLabel="Leagues"
        title={league.name}
        description={
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <PartnerStatusBadge status={league.status} />
            <span>
              {league.sportName} · {league.teamCount} teams
            </span>
          </span>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
        <div className="border-b border-cp-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Standings</h2>
        </div>
        {league.standings.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-cp-muted">No teams yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-cp-border bg-cp-elevated/40 text-[11px] uppercase tracking-wider text-cp-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold sm:px-4">#</th>
                  <th className="px-3 py-2 font-semibold sm:px-4">Team</th>
                  <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">P</th>
                  <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">W</th>
                  <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">D</th>
                  <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">L</th>
                  <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">Diff</th>
                  <th className="px-3 py-2 font-semibold tabular-nums sm:px-4">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cp-border">
                {league.standings.map((row, idx) => (
                  <tr key={row.teamId}>
                    <td className="px-3 py-2.5 tabular-nums text-cp-muted sm:px-4">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground sm:px-4">
                      {row.teamName}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.played}</td>
                    <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.wins}</td>
                    <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.draws}</td>
                    <td className="px-3 py-2.5 tabular-nums sm:px-4">{row.losses}</td>
                    <td className="px-3 py-2.5 tabular-nums sm:px-4">
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums sm:px-4">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Results</h2>
        <PartnerLeagueMatchesPanel
          matches={league.matches}
          defaultStatus="completed"
        />
      </section>

      <p className={alertPanelClass.info}>
        League results do not affect Gud Game career points or player tiers.
      </p>
    </div>
  );
}
