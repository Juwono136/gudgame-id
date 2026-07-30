import { AppError } from "@/lib/errors";
import {
  computeTimerEndsAt,
  isTimerExpired,
  resolveTimedWinner,
} from "@/lib/tournaments/scoring/engine";
import {
  getTournamentRoundDurationMinutes,
  getTournamentScoringType,
  getTournamentSuddenDeathExtensionMinutes,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type TimedMatchGateResult =
  | { blocked: false; timerEndsAt: Date | null }
  | {
      blocked: true;
      reason: "expired_tied_extend" | "expired_has_leader";
      timerEndsAt: Date | null;
      winner: "a" | "b" | null;
    };

/**
 * Enforce hard stop for timed tournaments on score increments.
 * Decrements / next_game / complete paths are allowed so hosts can correct or finish.
 */
export function assertTimedScoreAllowed(
  tournament: TournamentDetail,
  opts: {
    timerEndsAt: Date | null | undefined;
    scoreA: number;
    scoreB: number;
    action: string | undefined;
    suddenDeathExtended?: boolean;
  },
): TimedMatchGateResult {
  if (getTournamentScoringType(tournament) !== "timed") {
    return { blocked: false, timerEndsAt: opts.timerEndsAt ?? null };
  }

  const action = opts.action ?? "set";
  const isScoreIncrease =
    action === "increment" || action === "set_points" || action === "set";

  if (!isScoreIncrease) {
    return { blocked: false, timerEndsAt: opts.timerEndsAt ?? null };
  }

  if (!isTimerExpired(opts.timerEndsAt)) {
    return { blocked: false, timerEndsAt: opts.timerEndsAt ?? null };
  }

  const winner = resolveTimedWinner(opts.scoreA, opts.scoreB);
  if (winner.complete) {
    throw new AppError("Time is up — finalize the match (leader wins)", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  // Tied at expiry: allow a one-time sudden-death extension if not already applied.
  if (!opts.suddenDeathExtended) {
    return {
      blocked: true,
      reason: "expired_tied_extend",
      timerEndsAt: opts.timerEndsAt ?? null,
      winner: null,
    };
  }

  throw new AppError("Sudden death time is up — finalize or adjust scores", {
    code: "CONFLICT",
    statusCode: 409,
  });
}

export function buildSuddenDeathEndsAt(
  tournament: TournamentDetail,
  from: Date = new Date(),
): Date {
  const minutes = getTournamentSuddenDeathExtensionMinutes(tournament);
  return computeTimerEndsAt(from, 0, minutes);
}

export function buildInitialTimerEndsAt(
  tournament: TournamentDetail,
  startedAt: Date = new Date(),
): Date | null {
  if (getTournamentScoringType(tournament) !== "timed") return null;
  const minutes = getTournamentRoundDurationMinutes(tournament);
  return computeTimerEndsAt(startedAt, minutes, 0);
}

/** Metadata flag so we only extend sudden death once. */
export function hasSuddenDeathExtended(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return Boolean((metadata as { suddenDeathExtended?: unknown }).suddenDeathExtended);
}
