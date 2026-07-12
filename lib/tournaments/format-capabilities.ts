import type { DoubleStageSettings } from "@/lib/tournaments/scoring/config";
import { parseDoubleStageSettings } from "@/lib/tournaments/scoring/config";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type FormatCapabilities = {
  isAmericano: boolean;
  isSingleElimination: boolean;
  isDoubleStage: boolean;
  hasBracket: boolean;
  hasGroupStage: boolean;
  hasLobbyRounds: boolean;
  manageScoringMode: "rounds" | "bracket" | "groups";
  showBracketTab: boolean;
  showGroupsTab: boolean;
};

export function getDoubleStagePhase(tournament: TournamentDetail): "group" | "knockout" {
  const settings = tournament.settings as Record<string, unknown> | null | undefined;
  const ds = parseDoubleStageSettings(settings?.doubleStage);
  return ds.phase;
}

export function getFormatCapabilities(tournament: TournamentDetail): FormatCapabilities {
  const format = tournament.format;
  const isAmericano = format === "americano";
  const isDoubleStage = format === "double_stage";
  const isSingleElimination = format === "single_elimination";
  const phase = isDoubleStage ? getDoubleStagePhase(tournament) : null;

  const hasGroupStage = isDoubleStage && phase === "group";
  const hasBracket =
    isSingleElimination || (isDoubleStage && phase === "knockout") || format === "double_elimination";

  let manageScoringMode: FormatCapabilities["manageScoringMode"] = "rounds";
  if (isDoubleStage && phase === "group") manageScoringMode = "groups";
  else if (!isAmericano) manageScoringMode = "bracket";

  return {
    isAmericano,
    isSingleElimination,
    isDoubleStage,
    hasBracket,
    hasGroupStage,
    hasLobbyRounds: isAmericano,
    manageScoringMode,
    showBracketTab: !isAmericano,
    showGroupsTab: isDoubleStage,
  };
}

export function shouldProvisionBracketOnCreate(format: string): boolean {
  return format === "single_elimination" || format === "double_elimination";
}

export function getDoubleStageSettings(tournament: TournamentDetail): DoubleStageSettings {
  const settings = tournament.settings as Record<string, unknown> | null | undefined;
  return parseDoubleStageSettings(settings?.doubleStage);
}
