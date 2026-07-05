import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { TournamentLivePhase } from "@/lib/tournaments/core/types";

export function isTournamentTerminalStatus(status: string | null | undefined): boolean {
  return status === "completed" || status === "cancelled";
}

export function isTournamentLivePhaseTerminal(phase: TournamentLivePhase): boolean {
  return phase === "completed" || phase === "cancelled";
}

/** Effective status for UI/stats once the tournament is no longer live. */
export function resolveEffectiveMatchStatus(
  matchStatus: string,
  tournamentStatus: string | null | undefined,
): string {
  if (isTournamentTerminalStatus(tournamentStatus) && matchStatus === "in_progress") {
    return "completed";
  }
  return matchStatus;
}

export function resolveEffectiveMatchStatusForPhase(
  matchStatus: string,
  phase: TournamentLivePhase,
): string {
  if (isTournamentLivePhaseTerminal(phase) && matchStatus === "in_progress") {
    return "completed";
  }
  return matchStatus;
}

export function normalizeBracketMatchForDisplay(
  match: BracketMatchView,
  tournamentStatus: string | null | undefined,
): BracketMatchView {
  const status = resolveEffectiveMatchStatus(match.status, tournamentStatus);
  if (status === match.status) return match;
  return { ...match, status };
}

export function normalizeBracketMatchesForDisplay(
  matches: BracketMatchView[],
  tournamentStatus: string | null | undefined,
): BracketMatchView[] {
  if (!isTournamentTerminalStatus(tournamentStatus)) return matches;
  return matches.map((m) => normalizeBracketMatchForDisplay(m, tournamentStatus));
}

export function normalizeReclubMatchForDisplay(
  match: ReclubMatchView,
  tournamentStatus: string | null | undefined,
): ReclubMatchView {
  const status = resolveEffectiveMatchStatus(match.status, tournamentStatus);
  if (status === match.status) return match;
  return { ...match, status };
}

export function normalizeReclubMatchesForDisplay(
  matches: ReclubMatchView[],
  tournamentStatus: string | null | undefined,
): ReclubMatchView[] {
  if (!isTournamentTerminalStatus(tournamentStatus)) return matches;
  return matches.map((m) => normalizeReclubMatchForDisplay(m, tournamentStatus));
}

export function isMatchLiveForTournament(
  matchStatus: string | null | undefined,
  tournamentStatus: string | null | undefined,
): boolean {
  return (
    !isTournamentTerminalStatus(tournamentStatus) && matchStatus === "in_progress"
  );
}
