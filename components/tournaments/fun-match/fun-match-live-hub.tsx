"use client";

import type { ReactNode } from "react";
import { FunMatchRoundsPanel } from "@/components/tournaments/fun-match/fun-match-rounds-panel";
import type { FunMatchRoundGroup } from "@/lib/tournaments/reclub/round-groups";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { AmericanoPlayerRef } from "@/lib/tournaments/americano/court-assignments";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { cn } from "@/lib/utils";

type CourtView = { id: string; name: string; courtNumber: number };

type FunMatchLiveHubProps = {
  roundGroups: FunMatchRoundGroup[];
  currentRound: number;
  courts: CourtView[];
  teams: LobbyTeamView[];
  matchByCourt: Map<string, ReclubMatchView>;
  teamAByCourt?: Record<string, string>;
  teamBByCourt?: Record<string, string>;
  bracketPickByCourt?: Record<string, string>;
  startableBracketMatches?: BracketMatchView[];
  isBracketMode?: boolean;
  onTeamAChange?: (courtId: string, v: string) => void;
  onTeamBChange?: (courtId: string, v: string) => void;
  onBracketPickChange?: (courtId: string, matchId: string) => void;
  onStartCourt?: (courtId: string) => void;
  onScoreChange?: (
    matchId: string,
    input: {
      scoreA: number;
      scoreB: number;
      action?: "increment" | "decrement" | "set";
      side?: "a" | "b";
      isBracket?: boolean;
    },
  ) => void;
  onCompleteMatch?: (match: ReclubMatchView) => void;
  onEditCourtName?: (courtId: string, currentName: string) => void;
  canManage?: boolean;
  readOnly?: boolean;
  pointsPerMatch: number;
  scoringRules?: import("@/lib/tournaments/scoring/engine").ScoringRules;
  starting?: boolean;
  maxRounds?: number | null;
  onReshuffle?: () => void;
  onStartAllCourts?: () => void;
  onFinishRound?: () => void;
  hasActiveMatches?: boolean;
  toolbar?: ReactNode;
  className?: string;
  accentVariant?: "fun" | "official";
  isAmericanoMode?: boolean;
  americanoPlayers?: AmericanoPlayerRef[];
};

export function FunMatchLiveHub({
  roundGroups,
  currentRound,
  courts,
  teams,
  matchByCourt,
  teamAByCourt = {},
  teamBByCourt = {},
  bracketPickByCourt = {},
  startableBracketMatches = [],
  isBracketMode = false,
  onTeamAChange = () => {},
  onTeamBChange = () => {},
  onBracketPickChange = () => {},
  onStartCourt = () => {},
  onScoreChange = () => {},
  onCompleteMatch = () => {},
  onEditCourtName = () => {},
  canManage,
  readOnly = true,
  pointsPerMatch,
  scoringRules,
  starting,
  maxRounds,
  onReshuffle,
  onStartAllCourts,
  onFinishRound,
  hasActiveMatches,
  toolbar,
  className,
  accentVariant = "fun",
  isAmericanoMode = false,
  americanoPlayers = [],
}: FunMatchLiveHubProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {toolbar}
      <FunMatchRoundsPanel
        roundGroups={roundGroups}
        currentRound={currentRound}
        courts={courts}
        teams={teams}
        matchByCourt={matchByCourt}
        teamAByCourt={teamAByCourt}
        teamBByCourt={teamBByCourt}
        bracketPickByCourt={bracketPickByCourt}
        startableBracketMatches={startableBracketMatches}
        isBracketMode={isBracketMode}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
        onBracketPickChange={onBracketPickChange}
        onStartCourt={onStartCourt}
        onScoreChange={onScoreChange}
        onCompleteMatch={onCompleteMatch}
        onEditCourtName={onEditCourtName}
        canManage={canManage}
        readOnly={readOnly}
        pointsPerMatch={pointsPerMatch}
        scoringRules={scoringRules}
        starting={starting}
        maxRounds={maxRounds}
        onReshuffle={onReshuffle}
        onStartAllCourts={onStartAllCourts}
        onFinishRound={onFinishRound}
        hasActiveMatches={hasActiveMatches}
        accentVariant={accentVariant}
        isAmericanoMode={isAmericanoMode}
        americanoPlayers={americanoPlayers}
      />
    </div>
  );
}
