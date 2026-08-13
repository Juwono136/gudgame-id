import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { softDevPollMs } from "@/lib/dev/soft-poll";

/**
 * Public live board poll interval (tab focused).
 * Keep in sync with docs/tournament-guide.md §7.2.
 */
export function resolveLiveRefetchIntervalMs(
  data: TournamentLivePayload | undefined,
): number {
  const tournamentStatus = data?.tournament.status;
  const matches = data?.matches ?? [];
  const anyInProgress = matches.some((m) => m.status === "in_progress");

  if (anyInProgress) return softDevPollMs(4000);
  if (data?.phase === "live" || tournamentStatus === "live") return softDevPollMs(6000);
  if (data?.phase === "not_started" || tournamentStatus === "draft" || tournamentStatus === "open") {
    return softDevPollMs(10000);
  }
  if (data?.phase === "completed" || tournamentStatus === "completed") return softDevPollMs(20000);
  return softDevPollMs(8000);
}

/**
 * Manage scoring poll interval while the tab is focused.
 * Returns `false` when polling should pause (caller also gates write-in-flight).
 */
export function resolveManageScoringRefetchIntervalMs(input: {
  hasActiveReclub: boolean;
  hasActiveBracket: boolean;
  hasActiveGroup: boolean;
}): number {
  const hasLive =
    input.hasActiveReclub || input.hasActiveBracket || input.hasActiveGroup;
  return hasLive ? softDevPollMs(5000) : softDevPollMs(15000);
}

/** Clamp TV / venue display rotation interval (seconds). */
export function clampDisplayRotationIntervalSec(raw: number | undefined): number {
  return Math.min(120, Math.max(5, raw ?? 15));
}
