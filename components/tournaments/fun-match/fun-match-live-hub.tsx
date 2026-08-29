"use client";

import type { ReactNode } from "react";
import { FunMatchRoundsPanel } from "@/components/tournaments/fun-match/fun-match-rounds-panel";
import type { FunMatchRoundGroup } from "@/lib/tournaments/reclub/round-groups";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { AmericanoPlayerRef } from "@/lib/tournaments/americano/court-assignments";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { GroupMatchView } from "@/lib/tournaments/double-stage/service";
import type { StartableGroupFixture } from "@/lib/tournaments/double-stage/view-mappers";
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
  /** Pending knockout fixtures only — idle court picker (excludes completed rematch). */
  idleBracketPickerMatches?: BracketMatchView[];
  startableGroupMatches?: StartableGroupFixture[];
  activeGroupMatches?: GroupMatchView[];
  isBracketMode?: boolean;
  isGroupStageMode?: boolean;
  groupPickByCourt?: Record<string, string>;
  onGroupPickChange?: (courtId: string, matchId: string) => void;
  onTeamAChange?: (courtId: string, v: string) => void;
  onTeamBChange?: (courtId: string, v: string) => void;
  onBracketPickChange?: (courtId: string, matchId: string) => void;
  onStartCourt?: (courtId: string) => void;
  onScoreChange?: (
    matchId: string,
    input: {
      scoreA: number;
      scoreB: number;
      action?: "increment" | "decrement" | "set" | "set_points" | "next_game";
      side?: "a" | "b";
      targetPoints?: number;
      scorerName?: string;
      scorerUserId?: string;
      servingSide?: "a" | "b";
      serverName?: string;
      serverUserId?: string;
      isBracket?: boolean;
      isGroup?: boolean;
    },
  ) => void | Promise<unknown>;
  onCompleteMatch?: (match: ReclubMatchView) => void;
  onEditCourtName?: (courtId: string, currentName: string) => void;
  canManage?: boolean;
  readOnly?: boolean;
  pointsPerMatch: number;
  scoringRules?: import("@/lib/tournaments/scoring/engine").ScoringRules;
  gameRules?: import("@/lib/tournaments/scoring/game-mode").MatchGameRules | null;
  classicSetRules?: import("@/lib/tournaments/scoring/classic-sets").ClassicSetRules | null;
  scoreEntryMode?: "live" | "paper";
  sportSlug?: string;
  tournamentSlug?: string;
  onOverrideSuccess?: () => void;
  isCourtStarting?: (courtId: string) => boolean;
  startingAll?: boolean;
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
  onManageAmericanoPairings?: (courtId: string) => void;
  onOpenCourtside?: (courtId: string) => void;
  initialFocusedCourtId?: string | null;
  scoringFrozen?: boolean;
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
  idleBracketPickerMatches = [],
  startableGroupMatches = [],
  activeGroupMatches = [],
  isBracketMode = false,
  isGroupStageMode = false,
  groupPickByCourt = {},
  onGroupPickChange = () => {},
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
  gameRules = null,
  classicSetRules = null,
  scoreEntryMode = "live",
  sportSlug,
  tournamentSlug,
  onOverrideSuccess,
  isCourtStarting,
  startingAll,
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
  onManageAmericanoPairings,
  onOpenCourtside,
  initialFocusedCourtId = null,
  scoringFrozen = false,
}: FunMatchLiveHubProps) {
  return (
    <div className={cn(toolbar ? "space-y-4" : undefined, className)}>
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
        idleBracketPickerMatches={idleBracketPickerMatches}
        startableGroupMatches={startableGroupMatches}
        activeGroupMatches={activeGroupMatches}
        isBracketMode={isBracketMode}
        isGroupStageMode={isGroupStageMode}
        groupPickByCourt={groupPickByCourt}
        onGroupPickChange={onGroupPickChange}
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
        gameRules={gameRules}
        classicSetRules={classicSetRules}
        scoreEntryMode={scoreEntryMode}
        sportSlug={sportSlug}
        tournamentSlug={tournamentSlug}
        onOverrideSuccess={onOverrideSuccess}
        isCourtStarting={isCourtStarting}
        startingAll={startingAll}
        maxRounds={maxRounds}
        onReshuffle={onReshuffle}
        onStartAllCourts={onStartAllCourts}
        onFinishRound={onFinishRound}
        hasActiveMatches={hasActiveMatches}
        accentVariant={accentVariant}
        isAmericanoMode={isAmericanoMode}
        americanoPlayers={americanoPlayers}
        onManageAmericanoPairings={onManageAmericanoPairings}
        onOpenCourtside={onOpenCourtside}
        initialFocusedCourtId={initialFocusedCourtId}
        scoringFrozen={scoringFrozen}
      />
    </div>
  );
}
