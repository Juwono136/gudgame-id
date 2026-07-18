"use client";

import { ArrowRight, LayoutGrid, Loader2, Trophy } from "lucide-react";
import { DoubleStageConfigBanner } from "@/components/tournaments/double-stage/double-stage-config-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import type { TournamentDetail } from "@/lib/tournaments/service";

type DoubleStageBracketAwaitingPanelProps = {
  tournament: TournamentDetail;
  onOpenGroups: () => void;
};

export function DoubleStageBracketAwaitingPanel({
  tournament,
  onOpenGroups,
}: DoubleStageBracketAwaitingPanelProps) {
  const { data, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const overview = data?.doubleStage;

  if (!overview && isFetching) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <LoadingSpinner label="Loading group progress…" />
      </div>
    );
  }

  const groups = overview?.groups ?? [];
  const totalMatches = groups.reduce((n, g) => n + g.matches.length, 0);
  const completedMatches = groups.reduce(
    (n, g) => n + g.matches.filter((m) => m.status === "completed").length,
    0,
  );
  const progressPct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  const knockoutReady = overview?.knockoutReady ?? false;

  return (
    <div className="space-y-5">
      <DoubleStageConfigBanner tournament={tournament} />

      <Card className="overflow-hidden border-cp-border">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cp-primary/10 text-cp-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">Knockout bracket</h2>
              <p className="mt-1 text-sm leading-relaxed text-cp-muted">
                The elimination bracket is created after the group stage. While groups are still in
                progress, use this tab to track completion — then generate the bracket from the{" "}
                <span className="font-medium text-foreground">Groups</span> tab.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-cp-border bg-cp-elevated/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-foreground">Group stage progress</span>
              <span className="tabular-nums text-cp-muted">
                {completedMatches} / {totalMatches} matches
                {totalMatches > 0 ? ` (${progressPct}%)` : ""}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cp-elevated">
              <div
                className="h-full bg-cp-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {knockoutReady ? (
            <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-900 dark:text-emerald-100">
              <p className="font-medium">All group matches are complete.</p>
              <p className="mt-1 text-emerald-800/90 dark:text-emerald-100/90">
                The knockout bracket generates automatically from qualified teams only. If it has not
                appeared yet, open Groups and use{" "}
                <span className="font-semibold">Generate knockout bracket</span> as a retry. After
                that, return here to review the draw and score elimination rounds.
              </p>
              <Button type="button" className="mt-4" onClick={onOpenGroups}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Go to Groups
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-cp-border bg-cp-card/60 px-4 py-4 text-sm text-cp-muted">
              <p className="font-medium text-foreground">Bracket not available yet</p>
              <p className="mt-1">
                Finish scoring all group fixtures in{" "}
                <span className="font-medium text-foreground">Live scoring</span>. The knockout draw
                is created automatically when the group stage ends — only qualified teams enter.
              </p>
              {isFetching ? (
                <p className="mt-3 inline-flex items-center gap-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing progress…
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
