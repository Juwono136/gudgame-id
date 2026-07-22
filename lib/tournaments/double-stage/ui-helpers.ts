import {
  getTournamentCourtCount,
  getTournamentMatchScoreMode,
  getTournamentMatchScoringHint,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
  getTournamentSkillTier,
  getScoringTypeLabel,
} from "@/lib/tournaments/settings";
import {
  parseDoubleStageSettings,
  parseStandingsScoring,
} from "@/lib/tournaments/scoring/config";
import { matchPointsForTournamentTier } from "@/lib/player/tier";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type DoubleStageConfigSummary = {
  maxTeamsPerGroup: number;
  teamsAdvancePerGroup: number;
  thirdPlaceEnabled: boolean;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  allowDraw: boolean;
  pointsPerMatch: number;
  scoringTypeLabel: string;
  matchScoringHint: string;
  matchScoreMode: "points" | "games";
  courtCount: number;
  maxTeams: number | null;
  playersPerTeam: number;
  phase: "group" | "knockout";
};

export function getDoubleStageConfigSummary(
  tournament: TournamentDetail,
): DoubleStageConfigSummary {
  const settings = (tournament.settings ?? {}) as Record<string, unknown>;
  const ds = parseDoubleStageSettings(settings.doubleStage);
  const standings = parseStandingsScoring(settings.standingsScoring);
  const skillTier = getTournamentSkillTier(tournament);
  const winPoints = skillTier
    ? matchPointsForTournamentTier(skillTier)
    : standings.winPoints;

  return {
    maxTeamsPerGroup: ds.maxTeamsPerGroup,
    teamsAdvancePerGroup: ds.teamsAdvancePerGroup,
    thirdPlaceEnabled: ds.thirdPlaceEnabled ?? false,
    winPoints,
    drawPoints: standings.drawPoints,
    lossPoints: standings.lossPoints,
    allowDraw: standings.allowDraw,
    pointsPerMatch: getTournamentPointsPerMatch(tournament),
    scoringTypeLabel: getScoringTypeLabel(getTournamentScoringType(tournament)),
    matchScoringHint: getTournamentMatchScoringHint(tournament),
    matchScoreMode: getTournamentMatchScoreMode(tournament),
    courtCount: getTournamentCourtCount(tournament),
    maxTeams: tournament.maxTeams ?? null,
    playersPerTeam: tournament.playersPerTeam ?? 2,
    phase: ds.phase,
  };
}
