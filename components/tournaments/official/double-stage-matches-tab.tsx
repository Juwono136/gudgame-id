"use client";

import { useMemo } from "react";
import { MatchScheduleBoard } from "@/components/tournaments/double-stage/match-schedule-board";
import { Card, CardContent } from "@/components/ui/card";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { ScheduleMatchRow } from "@/lib/tournaments/double-stage/schedule-view";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import { getTournamentMatchScoreMode } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type BracketLiveRow = {
  id: string;
  roundNumber: number;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  scheduledAt?: string | null;
};

type DoubleStageMatchesTabProps = {
  tournament: TournamentDetail;
};

/**
 * Public FIFA-style scores & fixtures board for double-stage tournaments.
 * Inspired by World Cup schedule UX, adapted for Gud Game.
 */
export function DoubleStageMatchesTab({ tournament }: DoubleStageMatchesTabProps) {
  const { data: live } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const groups = (live?.doubleStage?.groups ?? []) as GroupOverview[];
  const bracketMatches = (live?.bracket?.matches ?? []) as BracketLiveRow[];
  const gamesScoreMode = getTournamentMatchScoreMode(tournament) === "games";

  const rows = useMemo((): ScheduleMatchRow[] => {
    const groupRows: ScheduleMatchRow[] = groups.flatMap((g) =>
      g.matches.map((m) => ({
        id: m.id,
        kind: "group" as const,
        stageLabel: `Group stage · ${g.name}`,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        scheduledAt: m.scheduledAt,
      })),
    );

    const totalRounds = bracketMatches.length
      ? Math.max(...bracketMatches.map((m) => m.roundNumber), 1)
      : 1;
    const bracketRows: ScheduleMatchRow[] = bracketMatches.map((m) => ({
      id: m.id,
      kind: "bracket" as const,
      stageLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
      scheduledAt: m.scheduledAt ?? null,
    }));

    return [...groupRows, ...bracketRows];
  }, [groups, bracketMatches]);

  if (!groups.length && !bracketMatches.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-cp-muted">
          Match schedule will appear when the group stage is live and fixtures are generated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cp-muted">
        Scores & fixtures for group stage and knockout.
      </p>
      <MatchScheduleBoard
        matches={rows}
        gamesScoreMode={gamesScoreMode}
        emptyMessage="No fixtures yet."
      />
    </div>
  );
}
