import type { FormatCapabilities } from "@/lib/tournaments/format-capabilities";
import {
  getFormatCapabilities,
  getDoubleStagePhase,
} from "@/lib/tournaments/format-capabilities";
import type { MatchScoreMode } from "@/lib/tournaments/scoring/game-mode";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  getMaxRounds,
  getTournamentCourtCount,
  getTournamentMatchScoreMode,
  getTournamentPointsPerMatch,
  getTournamentScoringType,
  type TournamentRaceStage,
  type TournamentScoringType,
} from "@/lib/tournaments/settings";

/**
 * Live scoring runtime snapshot — mirrors create/edit settings on every manage/scoring poll
 * so courts, rounds, and scoring rules stay aligned without waiting on manage-detail.
 */
export type ManageScoringRuntime = {
  /** Desired capacity from tournament settings (create/edit). */
  courtCount: number;
  /** Rows currently in `tournament_courts` after provision. */
  courtsProvisioned: number;
  /** True when provisioned court rows match configured courtCount. */
  courtsInSync: boolean;
  /** Session round cap (Fun Match / Mexicano / Official Americano). Null = unlimited or N/A. */
  maxRounds: number | null;
  scoringType: TournamentScoringType;
  pointsPerMatch: number;
  matchScoreMode: MatchScoreMode;
  /** Stage used to resolve matchScoreMode for dual group/KO settings. */
  raceStage: TournamentRaceStage;
  format: string;
  manageScoringMode: FormatCapabilities["manageScoringMode"];
  doubleStagePhase: "group" | "knockout" | null;
  /** ISO timestamp of tournament row — client refetches detail when this changes. */
  settingsUpdatedAt: string;
};

function resolveRaceStage(
  tournament: TournamentDetail,
  caps: FormatCapabilities,
): TournamentRaceStage {
  if (caps.manageScoringMode === "groups") return "group";
  if (caps.manageScoringMode === "bracket") return "knockout";
  if (caps.isDoubleStage) {
    return getDoubleStagePhase(tournament) === "knockout" ? "knockout" : "group";
  }
  return "default";
}

export function buildManageScoringRuntime(
  tournament: TournamentDetail,
  courtsProvisioned: number,
  caps: FormatCapabilities = getFormatCapabilities(tournament),
): ManageScoringRuntime {
  const courtCount = getTournamentCourtCount(tournament);
  const raceStage = resolveRaceStage(tournament, caps);
  return {
    courtCount,
    courtsProvisioned,
    courtsInSync: courtsProvisioned === courtCount,
    maxRounds: getMaxRounds(tournament),
    scoringType: getTournamentScoringType(tournament),
    pointsPerMatch: getTournamentPointsPerMatch(tournament),
    matchScoreMode: getTournamentMatchScoreMode(tournament, raceStage),
    raceStage,
    format: tournament.format,
    manageScoringMode: caps.manageScoringMode,
    doubleStagePhase: caps.isDoubleStage ? getDoubleStagePhase(tournament) : null,
    settingsUpdatedAt: tournament.updatedAt,
  };
}
