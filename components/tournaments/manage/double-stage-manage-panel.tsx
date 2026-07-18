"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Radio, Trophy } from "lucide-react";
import { toast } from "sonner";
import { DoubleStageConfigBanner } from "@/components/tournaments/double-stage/double-stage-config-banner";
import { DoubleStageFlowGuide } from "@/components/tournaments/double-stage/double-stage-flow-guide";
import { DoubleStageStandingsTable } from "@/components/tournaments/double-stage/double-stage-standings-table";
import { DoubleStageScheduleManage } from "@/components/tournaments/manage/double-stage-schedule-manage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { getTournamentMatchScoreMode } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

type DoubleStageManagePanelProps = {
  tournament: TournamentDetail;
  onOpenLiveScoring?: () => void;
};

function FixtureList({
  matches,
  gamesScoreMode,
}: {
  matches: {
    id: string;
    teamAName: string | null;
    teamBName: string | null;
    scoreA: number | null;
    scoreB: number | null;
    status: string;
  }[];
  gamesScoreMode: boolean;
}) {
  if (!matches.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">Fixtures</p>
      <ul className="space-y-1.5">
        {matches.map((match) => (
          <li
            key={match.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cp-border/80 bg-cp-elevated/20 px-3 py-2 text-sm"
          >
            <span className="min-w-0 font-medium text-foreground">
              {match.teamAName} vs {match.teamBName}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {match.status === "completed" ? (
                <span className="inline-flex flex-col items-end">
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {match.scoreA}–{match.scoreB}
                  </span>
                  {gamesScoreMode ? (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-cp-muted">
                      Games
                    </span>
                  ) : null}
                </span>
              ) : null}
              <Badge
                variant="muted"
                className={cn(
                  "text-[10px] capitalize",
                  match.status === "completed" &&
                    "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                  match.status === "in_progress" &&
                    "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                )}
              >
                {match.status.replace("_", " ")}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DoubleStageManagePanel({
  tournament,
  onOpenLiveScoring,
}: DoubleStageManagePanelProps) {
  const { data, refetch, isFetching } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const overview = data?.doubleStage;
  const bracketMatches = data?.bracketMatches ?? [];
  const [advancing, setAdvancing] = useState(false);
  const gamesScoreMode = getTournamentMatchScoreMode(tournament) === "games";
  const scoreDisplay = gamesScoreMode ? "games" : "diff";
  const showQualification = Boolean(overview?.allGroupMatchesCompleted);

  const advanceToKnockout = useCallback(async () => {
    setAdvancing(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/double-stage/advance`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to generate bracket");
      await refetch();
      toast.success("Knockout bracket generated");
      window.location.href = `${publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug)}?section=bracket`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate bracket");
    } finally {
      setAdvancing(false);
    }
  }, [refetch, tournament.slug, tournament.sportSlug]);

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-cp-muted">
          {isFetching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading groups…
            </span>
          ) : (
            "Groups will appear when the tournament goes live with at least 2 confirmed teams."
          )}
        </CardContent>
      </Card>
    );
  }

  if (overview.phase === "knockout") {
    return (
      <div className="space-y-5">
        <Card className="border-cp-primary/30 bg-cp-primary/5">
          <CardContent className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <Trophy className="h-8 w-8 shrink-0 text-cp-primary" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Group stage complete</p>
              <p className="mt-1 text-sm text-cp-muted">
                Knockout bracket is active. View final group tables below, set match times, or open
                the Bracket tab.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link
                href={`${publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug)}?section=bracket`}
              >
                Open bracket
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {overview.groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.name} — final standings</CardTitle>
              </CardHeader>
              <CardContent>
                <DoubleStageStandingsTable
                  group={group}
                  showQualification={showQualification}
                  scoreDisplay={scoreDisplay}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Match schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <DoubleStageScheduleManage
              tournament={tournament}
              groups={overview.groups}
              bracketMatches={bracketMatches}
              onUpdated={() => void refetch()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const openMatches = overview.groups.reduce(
    (n, g) => n + g.matches.filter((m) => m.status !== "completed").length,
    0,
  );

  return (
    <div className="space-y-5">
      <DoubleStageConfigBanner tournament={tournament} />

      <div className="flex flex-col gap-3 rounded-xl border border-cp-border bg-cp-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Groups — overview only</p>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted sm:text-sm">
            Track standings and fixtures here. Score matches in{" "}
            <span className="font-medium text-foreground">Live scoring</span>. When every group
            fixture is done, the knockout bracket is generated automatically.
          </p>
        </div>
        {onOpenLiveScoring ? (
          <Button type="button" className="shrink-0" onClick={onOpenLiveScoring}>
            <Radio className="mr-2 h-4 w-4" />
            Score group matches
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {overview.knockoutReady ? (
        <Card className="border-emerald-600/30 bg-emerald-500/5">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">All group matches completed</p>
              <p className="text-sm text-cp-muted">
                {overview.qualifiedCount} teams qualified · knockout generates automatically after
                the last result. Use the button if you need to retry.
              </p>
            </div>
            <Button onClick={() => void advanceToKnockout()} disabled={advancing} className="shrink-0">
              {advancing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate knockout bracket"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : openMatches > 0 ? (
        <p className="text-xs text-cp-muted sm:text-sm">
          {openMatches} group match{openMatches === 1 ? "" : "es"} still to play. Qualified /
          Eliminated badges appear only after every group fixture is finished.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {overview.groups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DoubleStageStandingsTable
                group={group}
                showQualification={showQualification}
                scoreDisplay={scoreDisplay}
              />
              <FixtureList matches={group.matches} gamesScoreMode={gamesScoreMode} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Match schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <DoubleStageScheduleManage
            tournament={tournament}
            groups={overview.groups}
            bracketMatches={bracketMatches}
            onUpdated={() => void refetch()}
          />
        </CardContent>
      </Card>

      <DoubleStageFlowGuide phase="group" variant="manage" />
    </div>
  );
}
