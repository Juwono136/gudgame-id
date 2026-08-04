import { notFound } from "next/navigation";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { PartnerLeagueMatchesPanel } from "@/components/partners/partner-league-matches-panel";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { getPartnerLeagueBySlug } from "@/lib/partners/leagues";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";

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

  const primary = partner.branding.primaryColor ?? "#0d9488";

  return (
    <div className={partnerPageClass("space-y-8 py-10 sm:py-12")}>
      <section
        className="overflow-hidden rounded-[1.5rem] border border-cp-border/80 bg-cp-card/70 p-5 shadow-sm sm:p-7"
        style={{
          background: `linear-gradient(125deg, ${primary}18 0%, transparent 48%, ${primary}0c 100%)`,
        }}
      >
        <PartnerPageHeader
          backHref={partnerPublicRoutes.leagues(partner.slug)}
          backLabel="Leagues"
          title={league.name}
          description={
            <span className="mt-2 flex flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2">
                <PartnerStatusBadge status={league.status} />
                <span>
                  {league.sportName} · {league.teamCount} teams · {league.matchCount} matches
                </span>
              </span>
              <span className="text-sm text-cp-muted">
                Season standings and results for {partner.displayName}. Manual scores — not linked
                to career rankings.
              </span>
            </span>
          }
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cp-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Standings</h2>
          <p className="text-xs text-cp-muted">Sorted by points, then goal difference</p>
        </div>
        {league.standings.length === 0 ? (
          <div className="px-4 py-12 text-center sm:px-6">
            <p className="text-sm font-medium text-foreground">No teams yet</p>
            <p className="mt-1 text-sm text-cp-muted">
              Standings appear once the organizer adds teams and records results.
            </p>
          </div>
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
                  <tr
                    key={row.teamId}
                    className={idx < 3 ? "bg-cp-primary/[0.04]" : undefined}
                  >
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
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-cp-primary sm:px-4">
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Results</h2>
          <p className="text-xs text-cp-muted">Completed fixtures only</p>
        </div>
        <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
          <PartnerLeagueMatchesPanel
            matches={league.matches}
            defaultStatus="completed"
          />
        </div>
      </section>
    </div>
  );
}
