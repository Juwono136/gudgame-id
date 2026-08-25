"use client";

import { ArrowRight, LayoutGrid, Loader2, Trophy } from "lucide-react";
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
      <div className="flex min-h-[200px] items-center justify-center">
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
    <Card className="overflow-hidden border-cp-border">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/10 text-cp-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Knockout bracket</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-cp-muted sm:text-sm">
              Unlocks after the group stage. Score fixtures in Live scoring; generate from Groups if
              needed.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-elevated/30 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">Group progress</span>
            <span className="tabular-nums text-cp-muted">
              {completedMatches}/{totalMatches}
              {totalMatches > 0 ? ` · ${progressPct}%` : ""}
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-cp-elevated">
            <div
              className="h-full bg-cp-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {knockoutReady ? (
          <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-900 dark:text-emerald-100 sm:px-4">
            <p className="font-medium">Group stage complete</p>
            <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-100/90 sm:text-sm">
              Bracket generates automatically. If it has not appeared, open Groups and retry{" "}
              <span className="font-semibold">Generate knockout</span>.
            </p>
            <Button type="button" size="sm" className="mt-3" onClick={onOpenGroups}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Go to Groups
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-cp-border bg-cp-card/60 px-3 py-3 text-sm text-cp-muted sm:px-4">
            <p className="font-medium text-foreground">Not available yet</p>
            <p className="mt-1 text-xs sm:text-sm">
              Finish all group fixtures in Live scoring. Only qualified teams enter the draw.
            </p>
            {isFetching ? (
              <p className="mt-2 inline-flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing…
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
