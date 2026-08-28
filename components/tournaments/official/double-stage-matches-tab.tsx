"use client";

import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import { MatchRecapShareCard } from "@/components/partners/match-recap-share-card";
import { MatchScheduleBoard } from "@/components/tournaments/double-stage/match-schedule-board";
import { TournamentDetailSection } from "@/components/tournaments/tournament-detail-ui";
import { Card, CardContent } from "@/components/ui/card";
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { ScheduleMatchRow } from "@/lib/tournaments/double-stage/schedule-view";
import { parseCallStatus } from "@/lib/tournaments/double-stage/schedule-view";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import {
  getTournamentDisplayConfig,
  getTournamentMatchScoreMode,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

type BracketLiveRow = {
  id: string;
  roundNumber: number;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers?: string[];
  teamBPlayers?: string[];
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  scheduledAt?: string | null;
  playOrder?: number | null;
  callStatus?: string | null;
  courtId?: string | null;
  completedAt?: string | null;
};

type DoubleStageMatchesTabProps = {
  tournament: TournamentDetail;
  /** When set, completed matches get shareable social recap cards. */
  partnerName?: string | null;
};

/**
 * Public FIFA-style scores & fixtures board for double-stage tournaments.
 * Inspired by World Cup schedule UX, adapted for Gud Game.
 */
export function DoubleStageMatchesTab({
  tournament,
  partnerName = null,
}: DoubleStageMatchesTabProps) {
  const { data: live } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const groups = (live?.doubleStage?.groups ?? []) as GroupOverview[];
  const bracketMatches = (live?.bracket?.matches ?? []) as BracketLiveRow[];
  const gamesScoreMode = getTournamentMatchScoreMode(tournament, "group") === "games";
  const brandPrimary =
    getTournamentDisplayConfig(tournament).brandTheme?.primaryColor ?? "#0d9488";

  const courts = live?.courts ?? [];

  const rows = useMemo((): ScheduleMatchRow[] => {
    const courtNameFor = (courtId: string | null | undefined) => {
      if (!courtId) return null;
      const label = resolveCourtLabel(courtId, courts);
      return label === "Court —" ? null : label;
    };

    const groupRows: ScheduleMatchRow[] = groups.flatMap((g) =>
      g.matches.map((m) => ({
        id: m.id,
        kind: "group" as const,
        stageLabel: `Group stage · ${g.name}`,
        stageKindLabel: "Group stage",
        groupName: g.name,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        teamAPlayers: m.teamAPlayers?.map((p) => p.displayName).filter(Boolean) ?? [],
        teamBPlayers: m.teamBPlayers?.map((p) => p.displayName).filter(Boolean) ?? [],
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        scheduledAt: m.scheduledAt,
        startedAt: m.startedAt,
        courtId: m.courtId,
        courtName: courtNameFor(m.courtId),
        playOrder: m.playOrder,
        callStatus: parseCallStatus(m.callStatus),
      })),
    );

    const totalRounds = bracketMatches.length
      ? Math.max(...bracketMatches.map((m) => m.roundNumber), 1)
      : 1;
    const bracketRows: ScheduleMatchRow[] = bracketMatches.map((m) => {
      const roundLabel = getBracketRoundLabel(m.roundNumber, totalRounds);
      return {
        id: m.id,
        kind: "bracket" as const,
        stageLabel: roundLabel,
        stageKindLabel: roundLabel,
        groupName: null,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        teamAPlayers: m.teamAPlayers ?? [],
        teamBPlayers: m.teamBPlayers ?? [],
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        scheduledAt: m.scheduledAt ?? null,
        courtId: m.courtId ?? null,
        courtName: courtNameFor(m.courtId),
        playOrder: m.playOrder ?? null,
        callStatus: parseCallStatus(m.callStatus),
      };
    });

    return [...groupRows, ...bracketRows];
  }, [groups, bracketMatches, courts]);

  const completedForRecap = useMemo(() => {
    if (!partnerName) return [];
    const fromGroups = groups.flatMap((g) =>
      g.matches
        .filter((m) => m.status === "completed" && m.teamAName && m.teamBName)
        .map((m) => ({
          id: m.id,
          stageLabel: `Group · ${g.name}`,
          teamAName: m.teamAName!,
          teamBName: m.teamBName!,
          teamAPlayers: m.teamAPlayers?.map((p) => p.displayName) ?? [],
          teamBPlayers: m.teamBPlayers?.map((p) => p.displayName) ?? [],
          scoreA: m.scoreA ?? 0,
          scoreB: m.scoreB ?? 0,
          completedAt: m.completedAt,
        })),
    );
    const fromBracket = bracketMatches
      .filter((m) => m.status === "completed" && m.teamAName && m.teamBName)
      .map((m) => ({
        id: m.id,
        stageLabel: "Knockout",
        teamAName: m.teamAName!,
        teamBName: m.teamBName!,
        teamAPlayers: m.teamAPlayers ?? [],
        teamBPlayers: m.teamBPlayers ?? [],
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
        completedAt: m.completedAt ?? null,
      }));
    return [...fromGroups, ...fromBracket].slice(-8).reverse();
  }, [groups, bracketMatches, partnerName]);

  if (!groups.length && !bracketMatches.length) {
    return (
      <Card className="border-dashed border-cp-border/80">
        <CardContent className="py-12 text-center text-sm text-cp-muted">
          Match schedule will appear when the group stage is live and fixtures are generated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TournamentDetailSection
        title="Order of play"
        icon={CalendarRange}
        iconClassName="text-cp-primary"
        headerAside={
          <span className="text-xs text-cp-muted sm:text-sm">
            {rows.length} fixture{rows.length === 1 ? "" : "s"}
          </span>
        }
      >
        <MatchScheduleBoard
          matches={rows}
          gamesScoreMode={gamesScoreMode}
          emptyMessage="No fixtures yet."
        />
      </TournamentDetailSection>

      {partnerName && completedForRecap.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              Shareable match recaps
            </h3>
            <p className="mt-0.5 text-xs text-cp-muted sm:text-sm">
              Auto-generated after each finished match — ready for social posts.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {completedForRecap.map((m) => (
              <li key={m.id}>
                <MatchRecapShareCard
                  variant="card"
                  primaryColor={brandPrimary}
                  recap={{
                    partnerName,
                    tournamentName: tournament.name,
                    teamAName: m.teamAName,
                    teamBName: m.teamBName,
                    teamAPlayers: m.teamAPlayers,
                    teamBPlayers: m.teamBPlayers,
                    scoreA: m.scoreA,
                    scoreB: m.scoreB,
                    roundLabel: m.stageLabel,
                    completedAt: m.completedAt,
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
