"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Search, Shuffle } from "lucide-react";
import { FunMatchRoundMatchCard } from "@/components/tournaments/fun-match/fun-match-round-match-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FunMatchRoundGroup } from "@/lib/tournaments/reclub/round-groups";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { AmericanoPlayerRef } from "@/lib/tournaments/americano/court-assignments";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { getReclubMatchHistoryKey } from "@/lib/tournaments/reclub/types";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import type { StartableGroupFixture } from "@/lib/tournaments/double-stage/view-mappers";
import type { ScoringRules } from "@/lib/tournaments/scoring/engine";
import { resolveCourtLabel } from "@/lib/tournaments/reclub/court-label";
import { cn } from "@/lib/utils";

type CourtView = { id: string; name: string; courtNumber: number };

type FunMatchRoundsPanelProps = {
  roundGroups: FunMatchRoundGroup[];
  currentRound: number;
  courts: CourtView[];
  teams: LobbyTeamView[];
  matchByCourt: Map<string, ReclubMatchView>;
  teamAByCourt: Record<string, string>;
  teamBByCourt: Record<string, string>;
  bracketPickByCourt?: Record<string, string>;
  startableBracketMatches?: BracketMatchView[];
  startableGroupMatches?: StartableGroupFixture[];
  activeGroupMatches?: GroupMatchView[];
  isBracketMode?: boolean;
  isGroupStageMode?: boolean;
  groupPickByCourt?: Record<string, string>;
  onGroupPickChange?: (courtId: string, matchId: string) => void;
  onTeamAChange: (courtId: string, v: string) => void;
  onTeamBChange: (courtId: string, v: string) => void;
  onBracketPickChange?: (courtId: string, matchId: string) => void;
  onStartCourt: (courtId: string) => void;
  onScoreChange: (
    matchId: string,
    input: {
      scoreA: number;
      scoreB: number;
      action?: "increment" | "decrement" | "set";
      side?: "a" | "b";
      scorerName?: string;
      scorerUserId?: string;
      isBracket?: boolean;
      isGroup?: boolean;
    },
  ) => void;
  onCompleteMatch: (match: ReclubMatchView) => void;
  onEditCourtName: (courtId: string, currentName: string) => void;
  canManage?: boolean;
  readOnly?: boolean;
  pointsPerMatch: number;
  scoringRules?: ScoringRules;
  gameRules?: import("@/lib/tournaments/scoring/game-mode").MatchGameRules | null;
  isCourtStarting?: (courtId: string) => boolean;
  startingAll?: boolean;
  maxRounds?: number | null;
  onReshuffle?: () => void;
  onStartAllCourts?: () => void;
  onFinishRound?: () => void;
  hasActiveMatches?: boolean;
  accentVariant?: "fun" | "official";
  isAmericanoMode?: boolean;
  americanoPlayers?: AmericanoPlayerRef[];
};

function roundTitle(
  roundNumber: number,
  group: FunMatchRoundGroup,
  isGroupStageMode?: boolean,
): string {
  if (isGroupStageMode) {
    if (group.liveCount > 0) return "Group stage · Live";
    if (group.completedCount === group.matches.length && group.matches.length > 0) {
      return "Group stage · Done";
    }
    return "Group stage";
  }
  if (roundNumber >= 9000) return `Round · Extra`;
  const live = group.liveCount > 0;
  const done = group.completedCount === group.matches.length && group.matches.length > 0;
  if (live) return `Round #${roundNumber} · Live`;
  if (done) return `Round #${roundNumber} · Done`;
  return `Round #${roundNumber}`;
}

export function FunMatchRoundsPanel({
  roundGroups,
  currentRound,
  courts,
  teams,
  matchByCourt,
  teamAByCourt,
  teamBByCourt,
  bracketPickByCourt = {},
  startableBracketMatches = [],
  startableGroupMatches = [],
  activeGroupMatches = [],
  isBracketMode = false,
  isGroupStageMode = false,
  groupPickByCourt = {},
  onGroupPickChange,
  onTeamAChange,
  onTeamBChange,
  onBracketPickChange,
  onStartCourt,
  onScoreChange,
  onCompleteMatch,
  onEditCourtName,
  canManage,
  readOnly,
  pointsPerMatch,
  scoringRules,
  gameRules = null,
  isCourtStarting,
  startingAll,
  maxRounds,
  onReshuffle,
  onStartAllCourts,
  onFinishRound,
  hasActiveMatches,
  accentVariant = "fun",
  isAmericanoMode = false,
  americanoPlayers = [],
}: FunMatchRoundsPanelProps) {
  const accentLabel = accentVariant === "official" ? "text-cp-primary" : "text-emerald-400";
  const [search, setSearch] = useState("");

  const sessionRoundGroups = useMemo(
    () => roundGroups.filter((g) => g.roundNumber < 9000),
    [roundGroups],
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessionRoundGroups;
    return sessionRoundGroups.filter((g) =>
      g.matches.some(
        (m) =>
          m.teamAName?.toLowerCase().includes(q) ||
          m.teamBName?.toLowerCase().includes(q) ||
          m.teamAPlayers.some((p) => p.toLowerCase().includes(q)) ||
          m.teamBPlayers.some((p) => p.toLowerCase().includes(q)),
      ),
    );
  }, [sessionRoundGroups, search]);

  const showPlanningSlots =
    canManage && !readOnly && courts.some((c) => !matchByCourt.get(c.id));

  return (
    <section className="flex min-h-[24rem] flex-col rounded-2xl border border-cp-border bg-cp-card">
      <header className="border-b border-cp-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              {isGroupStageMode ? "Group stage courts" : "Match rounds"}
            </h3>
            <p className="text-xs text-cp-muted">
              {isGroupStageMode
                ? `${courts.length} court${courts.length === 1 ? "" : "s"} · assign group fixtures`
                : `Round ${currentRound}${maxRounds != null ? ` of ${maxRounds}` : ""}`}
            </p>
          </div>
          {canManage && !readOnly ? (
            <div className="flex flex-wrap gap-2">
              {onReshuffle ? (
                <Button type="button" variant="outline" size="sm" onClick={onReshuffle}>
                  <Shuffle className="mr-1.5 h-4 w-4" />
                  Reshuffle
                </Button>
              ) : null}
              {onStartAllCourts ? (
                <Button type="button" size="sm" onClick={onStartAllCourts} disabled={startingAll}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Start all courts
                </Button>
              ) : null}
              {onFinishRound ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!hasActiveMatches}
                  onClick={onFinishRound}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Finish round
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player or squad…"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        {filteredGroups.length === 0 && !showPlanningSlots ? (
          <p className="py-8 text-center text-sm text-cp-muted">
            {isGroupStageMode
              ? "Assign group fixtures to idle courts below to start scoring."
              : "No rounds yet. The host will start matches when the session goes live."}
          </p>
        ) : null}

        {filteredGroups.map((group) => (
          <div key={group.roundNumber}>
            <h4
              className={cn(
                "mb-2 text-xs font-bold uppercase tracking-wider",
                group.liveCount > 0 ? "text-amber-400" : "text-cp-muted",
              )}
            >
              {roundTitle(group.roundNumber, group, isGroupStageMode)}
            </h4>
            <div className="space-y-3">
              {group.matches.map((match, matchIndex) => {
                const court = courts.find((c) => c.id === match.courtId);
                const courtIndex = court
                  ? courts.findIndex((c) => c.id === court.id)
                  : matchIndex;
                return (
                  <FunMatchRoundMatchCard
                    key={getReclubMatchHistoryKey(match)}
                    match={match}
                    courtName={resolveCourtLabel(match.courtId, courts, courtIndex)}
                    canManage={canManage && !readOnly}
                    readOnly={readOnly}
                    pointsPerMatch={pointsPerMatch}
                    scoringRules={scoringRules}
                    gameRules={gameRules}
                    onScoreChange={(input) =>
                      onScoreChange(match.id, {
                        ...input,
                        isBracket:
                          match.sourceKind === "bracket" || match.playType === "bracket",
                        isGroup:
                          match.sourceKind === "group_stage" || match.playType === "group_stage",
                      })
                    }
                    onComplete={() => onCompleteMatch(match)}
                    onEditCourtName={
                      match.courtId
                        ? () => onEditCourtName(match.courtId!, court?.name ?? "")
                        : undefined
                    }
                    accentVariant={accentVariant}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {showPlanningSlots ? (
          <div>
            <h4 className={cn("mb-2 text-xs font-bold uppercase tracking-wider", accentLabel)}>
              {isGroupStageMode ? "Idle courts · assign fixtures" : `Round #${currentRound} · Up next`}
            </h4>
            <div className="space-y-3">
              {courts
                .filter((c) => !matchByCourt.get(c.id))
                .map((court) => (
                  <FunMatchRoundMatchCard
                    key={court.id}
                    courtName={court.name}
                    teams={teams.filter((t) => t.memberCount > 0)}
                    teamAId={teamAByCourt[court.id] ?? ""}
                    teamBId={teamBByCourt[court.id] ?? ""}
                    bracketMatchId={bracketPickByCourt[court.id] ?? ""}
                    groupMatchId={groupPickByCourt[court.id] ?? ""}
                    startableBracketMatches={isBracketMode ? startableBracketMatches : []}
                    startableGroupMatches={isGroupStageMode ? startableGroupMatches : []}
                    activeGroupMatches={isGroupStageMode ? activeGroupMatches : []}
                    isGroupStageMode={isGroupStageMode}
                    onGroupPickChange={(v) => onGroupPickChange?.(court.id, v)}
                    onTeamAChange={(v) => onTeamAChange(court.id, v)}
                    onTeamBChange={(v) => onTeamBChange(court.id, v)}
                    onBracketPickChange={(v) => onBracketPickChange?.(court.id, v)}
                    onStart={() => onStartCourt(court.id)}
                    isStarting={isCourtStarting?.(court.id) ?? false}
                    canManage
                    pointsPerMatch={pointsPerMatch}
                    scoringRules={scoringRules}
                    gameRules={gameRules}
                    onEditCourtName={() => onEditCourtName(court.id, court.name)}
                    accentVariant={accentVariant}
                    isAmericanoMode={isAmericanoMode}
                    americanoPlayers={americanoPlayers}
                  />
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
