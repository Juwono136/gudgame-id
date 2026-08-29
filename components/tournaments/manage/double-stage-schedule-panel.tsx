"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { DoubleStageScheduleManage } from "@/components/tournaments/manage/double-stage-schedule-manage";
import { Card, CardContent } from "@/components/ui/card";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import type { TournamentDetail } from "@/lib/tournaments/service";

type DoubleStageSchedulePanelProps = {
  tournament: TournamentDetail;
  onOpenLiveScoring?: () => void;
};

export function DoubleStageSchedulePanel({
  tournament,
  onOpenLiveScoring,
}: DoubleStageSchedulePanelProps) {
  const { data, refetch, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const overview = data?.doubleStage;
  const bracketMatches = data?.bracketMatches ?? [];
  const courts = useMemo(
    () =>
      (data?.courts ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        courtNumber: c.courtNumber,
      })),
    [data?.courts],
  );

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-cp-muted">
          {isFetching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
            </span>
          ) : (
            "Match schedule appears when the tournament is live and fixtures are generated."
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {isFetching ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
        </p>
      ) : null}
      <DoubleStageScheduleManage
        tournament={tournament}
        groups={overview.groups}
        bracketMatches={bracketMatches}
        courts={courts}
        onUpdated={() => void refetch()}
        onStarted={onOpenLiveScoring}
      />
    </div>
  );
}
