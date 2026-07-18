"use client";

import { DoubleStageConfigBanner } from "@/components/tournaments/double-stage/double-stage-config-banner";
import { DoubleStageStandingsTable } from "@/components/tournaments/double-stage/double-stage-standings-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { getDoubleStageConfigSummary } from "@/lib/tournaments/double-stage/ui-helpers";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getTournamentMatchScoreMode } from "@/lib/tournaments/settings";

type DoubleStageGroupsTabProps = {
  tournament: TournamentDetail;
};

export function DoubleStageGroupsTab({ tournament }: DoubleStageGroupsTabProps) {
  const { data: live } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const doubleStage = live?.doubleStage;
  const groups = (doubleStage?.groups ?? []) as GroupOverview[];
  const cfg = getDoubleStageConfigSummary(tournament);
  const scoreDisplay =
    getTournamentMatchScoreMode(tournament) === "games" ? "games" : "diff";

  if (!groups.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-cp-muted">
          Group standings will appear when the tournament is live and groups are generated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <DoubleStageConfigBanner tournament={tournament} />

      <div className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-sm text-cp-muted">
        <span className="font-medium text-foreground">Group stage</span> — teams play round-robin
        within each group. Top {cfg.teamsAdvancePerGroup} per group advance to knockout when the
        stage completes.
      </div>

      {doubleStage?.knockoutReady && doubleStage.phase === "group" ? (
        <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          All group matches finished — knockout bracket will be published shortly.
        </div>
      ) : null}

      {doubleStage?.phase === "knockout" ? (
        <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/8 px-4 py-3 text-sm text-foreground">
          Knockout stage is underway. Final group standings are shown below.
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="border-b border-cp-border/60 pb-3">
              <CardTitle className="text-base sm:text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <DoubleStageStandingsTable
                group={group}
                showQualification
                compact
                scoreDisplay={scoreDisplay}
              />

              {group.matches.some((m) => m.status === "completed") ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">
                    Recent results
                  </p>
                  <ul className="divide-y divide-cp-border/60 rounded-lg border border-cp-border">
                    {group.matches
                      .filter((m) => m.status === "completed")
                      .slice(-5)
                      .map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 font-medium text-foreground">
                            {m.teamAName}{" "}
                            <span className="font-normal text-cp-muted">vs</span> {m.teamBName}
                          </span>
                          <span className="inline-flex shrink-0 flex-col items-end gap-0.5">
                            <span className="font-mono tabular-nums text-foreground">
                              {m.scoreA}–{m.scoreB}
                            </span>
                            {scoreDisplay === "games" ? (
                              <span className="text-[10px] uppercase tracking-wide text-cp-muted">
                                Games
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-cp-muted sm:text-sm">No completed matches yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
