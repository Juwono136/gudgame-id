"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DoubleStageConfigBanner } from "@/components/tournaments/double-stage/double-stage-config-banner";
import { DoubleStageFlowGuide } from "@/components/tournaments/double-stage/double-stage-flow-guide";
import { DoubleStageGroupMatchCard } from "@/components/tournaments/manage/double-stage-group-match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { enqueueGroupScoreUpdate } from "@/hooks/use-double-stage-group-score";
import { getDoubleStageConfigSummary } from "@/lib/tournaments/double-stage/ui-helpers";
import {
  getTournamentClassicSetRules,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentScoreEntryMode,
  isClassicSetsFormat,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

type DoubleStageGroupScoringPanelProps = {
  tournament: TournamentDetail;
};

export function DoubleStageGroupScoringPanel({ tournament }: DoubleStageGroupScoringPanelProps) {
  const { data, refetch, isFetching, isLoading } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const overview = data?.doubleStage;
  const cfg = getDoubleStageConfigSummary(tournament);
  const maxScore = cfg.pointsPerMatch;
  const gamesMode = getTournamentMatchScoreMode(tournament) === "games";
  const gameRules = gamesMode ? getTournamentGameRules(tournament, "group") : null;
  const classicSetRules = isClassicSetsFormat(tournament)
    ? getTournamentClassicSetRules(tournament)
    : null;
  const scoreEntryMode = getTournamentScoreEntryMode(tournament);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  const groups = overview?.groups ?? [];
  const selectedGroupId = activeGroupId ?? groups[0]?.id ?? null;
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const pendingCount = useMemo(
    () =>
      groups.reduce(
        (n, g) => n + g.matches.filter((m) => m.status !== "completed").length,
        0,
      ),
    [groups],
  );

  const postScore = useCallback(
    async (
      matchId: string,
      action: "start" | "record" | "update",
      scores?: {
        scoreA: number;
        scoreB: number;
        scoreAction?: "increment" | "decrement" | "set" | "set_points" | "next_game";
        side?: "a" | "b";
        targetPoints?: number;
        scorerName?: string;
        scorerUserId?: string;
        servingSide?: "a" | "b";
        serverName?: string;
        serverUserId?: string;
      },
    ) => {
      const showBusy = action !== "update";
      if (showBusy) setBusyMatchId(matchId);
      try {
        const body =
          action === "start"
            ? { action: "start", matchId }
            : action === "update"
              ? {
                  action: "update",
                  matchId,
                  scoreA: scores!.scoreA,
                  scoreB: scores!.scoreB,
                  scoreAction: scores!.scoreAction,
                  side: scores!.side,
                  targetPoints: scores!.targetPoints,
                  scorerName: scores!.scorerName,
                  scorerUserId: scores!.scorerUserId,
                  servingSide: scores!.servingSide,
                  serverName: scores!.serverName,
                  serverUserId: scores!.serverUserId,
                }
              : { action: "record", matchId, scoreA: scores!.scoreA, scoreB: scores!.scoreB };
        await enqueueGroupScoreUpdate(matchId, async () => {
          const response = await fetch(
            `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/double-stage/score`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
          );
          const json = await parseJsonResponse<{
            success?: boolean;
            error?: unknown;
          }>(response);
          if (!response.ok) {
            throw new Error(extractApiErrorMessage(json, "Failed to update match"));
          }
          return json;
        });
        await refetch();
        if (action === "start") toast.success("Match started");
        else if (action === "record") toast.success("Score saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update match");
      } finally {
        if (showBusy) setBusyMatchId(null);
      }
    },
    [refetch, tournament.slug, tournament.sportSlug],
  );

  if (isLoading && !overview) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-cp-border bg-cp-card/40">
        <LoadingSpinner label="Loading group matches…" />
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-cp-muted">
          Group matches appear when the tournament goes live with confirmed teams.
        </CardContent>
      </Card>
    );
  }

  if (overview.phase === "knockout") {
    return (
      <Card className="border-cp-primary/30 bg-cp-primary/5">
        <CardContent className="py-8 text-center text-sm text-cp-muted">
          Group stage is complete. Score knockout matches from Live scoring (bracket mode) or the
          Bracket tab.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-5">
      {isFetching && overview ? (
        <div className="pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-full border border-cp-border bg-cp-card/90 px-2.5 py-1 text-[11px] text-cp-muted shadow-sm backdrop-blur-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Syncing…
        </div>
      ) : null}

      <DoubleStageConfigBanner tournament={tournament} />

      <div className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 text-sm text-cp-muted">
        <span className="font-medium text-foreground">Live scoring — group stage only.</span> Start
        each fixture before adjusting scores. Standings on the{" "}
        <span className="font-medium text-foreground">Groups</span> tab update when you finalize a
        match.
        {pendingCount > 0 ? (
          <span className="mt-1 block text-xs">
            {pendingCount} match{pendingCount === 1 ? "" : "es"} remaining in group stage.
          </span>
        ) : null}
      </div>

      {groups.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => {
            const open = group.matches.filter((m) => m.status !== "completed").length;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selectedGroupId === group.id
                    ? "border-cp-primary bg-cp-primary text-white"
                    : "border-cp-border bg-cp-card text-cp-muted hover:border-cp-primary/40 hover:text-foreground",
                )}
              >
                {group.name}
                {open > 0 ? (
                  <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                    {open}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedGroup ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">
              {selectedGroup.name} — score matches
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {selectedGroup.matches.map((match) => (
              <DoubleStageGroupMatchCard
                key={match.id}
                match={match}
                maxScore={maxScore}
                busy={busyMatchId === match.id}
                gameRules={gameRules}
                classicSetRules={classicSetRules}
                scoreEntryMode={scoreEntryMode}
                sportSlug={tournament.sportSlug}
                tournamentSlug={tournament.slug}
                onStart={() => postScore(match.id, "start")}
                onLivePoint={(input) => postScore(match.id, "update", input)}
                onFinalize={(scores) => postScore(match.id, "record", scores)}
                onOverrideSuccess={() => void refetch()}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <DoubleStageFlowGuide phase="group" variant="manage" />
    </div>
  );
}
