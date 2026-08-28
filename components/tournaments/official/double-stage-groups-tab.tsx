"use client";

import { useMemo, useState } from "react";
import {
  DoubleStageStandingsLegend,
  DoubleStageStandingsTable,
} from "@/components/tournaments/double-stage/double-stage-standings-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getTournamentMatchScoreMode, isClassicSetsFormat } from "@/lib/tournaments/settings";
import { tournamentUsesBestieCupPoolRules } from "@/lib/tournaments/partner/bestie-cup-config";
import { cn } from "@/lib/utils";

type DoubleStageGroupsTabProps = {
  tournament: TournamentDetail;
};

export function DoubleStageGroupsTab({ tournament }: DoubleStageGroupsTabProps) {
  const { data: live } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const doubleStage = live?.doubleStage;
  const groups = (doubleStage?.groups ?? []) as GroupOverview[];
  const [activeGroupId, setActiveGroupId] = useState<string>("all");
  const visibleGroups = useMemo(() => {
    if (activeGroupId === "all") return groups;
    return groups.filter((g) => g.id === activeGroupId);
  }, [groups, activeGroupId]);
  const scoreDisplay = isClassicSetsFormat(tournament, "group")
    ? "sets"
    : getTournamentMatchScoreMode(tournament, "group") === "games"
      ? "games"
      : "diff";
  const showGameWinPct = tournamentUsesBestieCupPoolRules(tournament);

  if (!groups.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-cp-muted">
          Group standings appear when the tournament is live and groups are generated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DoubleStageStandingsLegend scoreDisplay={scoreDisplay} showGameWinPct={showGameWinPct} />
        {groups.length > 2 ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="public-group-filter" className="text-xs text-cp-muted sm:text-sm">
              Group
            </label>
            <select
              id="public-group-filter"
              value={activeGroupId}
              onChange={(e) => setActiveGroupId(e.target.value)}
              className="h-9 rounded-lg border border-cp-border bg-cp-card px-3 text-sm text-foreground"
            >
              <option value="all">All groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {tournament.format !== "group_only" &&
      doubleStage?.knockoutReady &&
      doubleStage.phase === "group" ? (
        <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-900 dark:text-emerald-100">
          Group stage complete — knockout bracket is generating. Check Bracket or Matches shortly.
        </div>
      ) : null}

      {tournament.format === "group_only" && doubleStage?.allGroupMatchesCompleted ? (
        <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/8 px-3 py-2.5 text-sm text-foreground">
          All fixtures complete — standings above are final.
        </div>
      ) : null}

      {tournament.format !== "group_only" && doubleStage?.phase === "knockout" ? (
        <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/8 px-3 py-2.5 text-sm text-foreground">
          Knockout underway — final group tables below. Full schedule is on Matches.
        </div>
      ) : null}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {visibleGroups.map((group) => {
          const recent = group.matches
            .filter((m) => m.status === "completed")
            .slice(-4);

          return (
            <Card
              key={group.id}
              className="overflow-hidden border-cp-border/80 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="border-b border-cp-border/60 bg-cp-elevated/20 py-3">
                <CardTitle className="text-sm sm:text-base">{group.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4">
                <DoubleStageStandingsTable
                  group={group}
                  showQualification={Boolean(doubleStage?.allGroupMatchesCompleted)}
                  compact
                  scoreDisplay={scoreDisplay}
                  showGameWinPct={showGameWinPct}
                />

                {recent.length > 0 ? (
                  <ul className="divide-y divide-cp-border/60 overflow-hidden rounded-lg border border-cp-border">
                    {recent.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs sm:text-sm"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground">
                          {m.teamAName}{" "}
                          <span className="font-normal text-cp-muted">vs</span> {m.teamBName}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-foreground">
                          {m.scoreA}–{m.scoreB}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-cp-muted">No results yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
