import "server-only";

import type { TournamentStatus } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";

/** Completed and cancelled tournaments are read-only for metadata edits. */
const NON_EDITABLE_STATUSES: TournamentStatus[] = ["completed", "cancelled"];

export function assertTournamentEditable(tournament: TournamentDetail): void {
  if (NON_EDITABLE_STATUSES.includes(tournament.status as TournamentStatus)) {
    throw new AppError(
      "This tournament is finished and can no longer be edited.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }
}

export function assertTournamentDeletable(tournament: TournamentDetail): void {
  if (tournament.status === "live") {
    throw new AppError("Cannot delete a live tournament. Mark it completed or cancelled first.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
}

export function canEditTournament(status: string): boolean {
  return !NON_EDITABLE_STATUSES.includes(status as TournamentStatus);
}

export function canShowManageActions(tournament: {
  status: string | null;
  tournamentId: number | null;
  canManage: boolean;
}): boolean {
  if (!tournament.tournamentId || !tournament.canManage) return false;
  if (!tournament.status) return true;
  return canEditTournament(tournament.status);
}
