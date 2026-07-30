import "server-only";

import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { buildActiveCourtLockState } from "@/lib/tournaments/reclub/active-court-lock";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";

async function loadTeamMemberIds(teamIds: string[]): Promise<string[]> {
  if (!teamIds.length) return [];
  const rows = await getDb()
    .select({
      userId: tournamentTeamMembers.userId,
      partnerPlayerId: tournamentTeamMembers.partnerPlayerId,
    })
    .from(tournamentTeamMembers)
    .where(inArray(tournamentTeamMembers.teamId, teamIds));
  return [
    ...new Set(
      rows
        .map((r) => r.userId ?? r.partnerPlayerId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

export async function assertAmericanoPlayersAvailableForCourt(
  activeMatches: ReclubMatchView[],
  playerIds: string[],
  courtId: string,
): Promise<void> {
  const others = activeMatches.filter((m) => m.courtId !== courtId);
  const activePlayerIds = new Set<string>();

  for (const match of others) {
    if (match.americanoPairing) {
      for (const id of [...match.americanoPairing.sideA, ...match.americanoPairing.sideB]) {
        activePlayerIds.add(id);
      }
      continue;
    }

    const ids = await loadTeamMemberIds(
      [match.teamAId, match.teamBId].filter((id): id is string => Boolean(id)),
    );
    ids.forEach((id) => activePlayerIds.add(id));
  }

  const overlap = playerIds.find((id) => activePlayerIds.has(id));
  if (overlap) {
    throw new AppError(
      "One or more players are already active on another court. Finish that match first.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}

export async function assertTeamsAvailableForCourt(
  activeMatches: ReclubMatchView[],
  teamAId: string,
  teamBId: string,
  courtId: string,
): Promise<void> {
  const others = activeMatches.filter((m) => m.courtId !== courtId);
  const lock = buildActiveCourtLockState(others, []);

  if (lock.busyTeamIds.has(teamAId) || lock.busyTeamIds.has(teamBId)) {
    throw new AppError("One or both squads are already playing on another court", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const activePlayerIds = new Set<string>();
  for (const match of others) {
    const ids = await loadTeamMemberIds(
      [match.teamAId, match.teamBId].filter((id): id is string => Boolean(id)),
    );
    ids.forEach((id) => activePlayerIds.add(id));
  }

  const newPlayerIds = await loadTeamMemberIds([teamAId, teamBId]);
  const overlap = newPlayerIds.find((id) => activePlayerIds.has(id));
  if (overlap) {
    throw new AppError(
      "A player from one of these squads is already active on another court. Finish that match first.",
      { code: "CONFLICT", statusCode: 409 },
    );
  }
}
