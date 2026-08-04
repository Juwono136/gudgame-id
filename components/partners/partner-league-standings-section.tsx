import { Button } from "@/components/ui/button";
import type { PartnerLeagueStandingRow } from "@/lib/partners/league-types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

type PartnerLeagueStandingsSectionProps = {
  standings: PartnerLeagueStandingRow[];
  /** Dashboard-only: open add-team dialog */
  onAddTeam?: () => void;
  className?: string;
};

export function PartnerLeagueStandingsSection({
  standings,
  onAddTeam,
  className,
}: PartnerLeagueStandingsSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cp-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Standings</h2>
          <p className="text-xs text-cp-muted">
            {onAddTeam
              ? "Optional table for club teams in this league"
              : "Sorted by points, then goal difference"}
          </p>
        </div>
        {onAddTeam ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-cp-border"
            onClick={onAddTeam}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add team
          </Button>
        ) : null}
      </div>

      {standings.length === 0 ? (
        <div className="px-4 py-10 text-center sm:px-6">
          <p className="text-sm font-medium text-foreground">No standings yet</p>
          <p className="mt-1 text-sm text-cp-muted">
            {onAddTeam
              ? "Add teams to start the table. Tournaments above are the main league content."
              : "Standings appear once the organizer adds teams and records results."}
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
              {standings.map((row, idx) => (
                <tr key={row.teamId} className={idx < 3 ? "bg-cp-primary/[0.04]" : undefined}>
                  <td className="px-3 py-2.5 tabular-nums text-cp-muted sm:px-4">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground sm:px-4">
                    {row.teamName}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground sm:px-4">{row.played}</td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground sm:px-4">{row.wins}</td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground sm:px-4">{row.draws}</td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground sm:px-4">{row.losses}</td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground sm:px-4">
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
  );
}
