import type { DoubleStageSettings } from "@/lib/tournaments/scoring/config";
import { parseDoubleStageSettings } from "@/lib/tournaments/scoring/config";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  formatHasGroupStage,
  formatHasKnockout,
  formatHasLobbyRounds,
  resolveFormatEngine,
} from "@/lib/tournaments/match-config";
import { parseTournamentSettings } from "@/lib/tournaments/settings";

export type FormatCapabilities = {
  isAmericano: boolean;
  isSingleElimination: boolean;
  isDoubleStage: boolean;
  isMexicano: boolean;
  isGroupOnly: boolean;
  hasBracket: boolean;
  hasGroupStage: boolean;
  hasLobbyRounds: boolean;
  manageScoringMode: "rounds" | "bracket" | "groups";
  showBracketTab: boolean;
  showGroupsTab: boolean;
  /** Match Schedule / Order of Play manage section (group formats). */
  showScheduleTab: boolean;
  canGenerateKnockout: boolean;
};

export function getDoubleStagePhase(tournament: TournamentDetail): "group" | "knockout" {
  const engine = resolveFormatEngine(tournament.format);
  if (engine === "group_only") return "group";
  const settings = tournament.settings as Record<string, unknown> | null | undefined;
  const ds = parseDoubleStageSettings(settings?.doubleStage);
  return ds.phase;
}

export function getFormatCapabilities(tournament: TournamentDetail): FormatCapabilities {
  const format = tournament.format;
  const engine = resolveFormatEngine(format);
  const isAmericano = engine === "americano";
  const isDoubleStage = engine === "double_stage";
  const isSingleElimination = engine === "single_elimination";
  const isMexicano = engine === "mexicano";
  const isGroupOnly =
    engine === "group_only" || format === "swiss" || format === "modified_swiss";
  const phase = isDoubleStage ? getDoubleStagePhase(tournament) : null;

  // Active group-stage workspace only (not "format supports groups someday").
  // Double-stage in knockout must flip this off so Bracket + live scoring use
  // elimination paths instead of the awaiting/group UI.
  const hasGroupStage = isGroupOnly || (isDoubleStage && phase === "group");
  const hasBracket =
    isSingleElimination ||
    (isDoubleStage && phase === "knockout") ||
    format === "double_elimination";

  let manageScoringMode: FormatCapabilities["manageScoringMode"] = "rounds";
  if (hasGroupStage) manageScoringMode = "groups";
  else if (!isAmericano && !isMexicano) manageScoringMode = "bracket";

  return {
    isAmericano,
    isSingleElimination,
    isDoubleStage,
    isMexicano,
    isGroupOnly,
    hasBracket,
    hasGroupStage,
    hasLobbyRounds: formatHasLobbyRounds(format),
    manageScoringMode,
    showBracketTab: formatHasKnockout(format) && !isGroupOnly && !isAmericano && !isMexicano,
    showGroupsTab: isDoubleStage || isGroupOnly || formatHasGroupStage(format),
    showScheduleTab: isDoubleStage || isGroupOnly || formatHasGroupStage(format),
    canGenerateKnockout: formatHasKnockout(format) && !isGroupOnly,
  };
}

export function shouldProvisionBracketOnCreate(format: string): boolean {
  return format === "single_elimination" || format === "double_elimination";
}

export function getDoubleStageSettings(tournament: TournamentDetail): DoubleStageSettings {
  const settings = tournament.settings as Record<string, unknown> | null | undefined;
  return parseDoubleStageSettings(settings?.doubleStage);
}

export function getGroupMeetingsPerPair(tournament: TournamentDetail): number {
  if (tournament.format === "modified_swiss") return 1;
  const settings = parseTournamentSettings(tournament.settings);
  // Original family always plays each pair once (ignore leftover customMatch JSON).
  if ((settings.formatFamily ?? "original") !== "custom") return 1;
  return settings.customMatch?.groupMeetingsPerPair ?? 1;
}

export function getKnockoutLegsPerSlot(tournament: TournamentDetail): number {
  const settings = parseTournamentSettings(tournament.settings);
  if ((settings.formatFamily ?? "original") !== "custom") return 1;
  return settings.customMatch?.knockoutLegsPerSlot ?? 1;
}
