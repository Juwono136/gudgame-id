import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  partnerPlayers,
  partnerTournamentRegistrationMembers,
  partnerTournamentRegistrations,
} from "@/db/schema/partner-players";
import {
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partner-player-archive" });

const ACTIVE_REGISTRATION_STATUSES = ["awaiting_payment", "registered", "confirmed"] as const;
const ACTIVE_TOURNAMENT_STATUSES = ["draft", "upcoming", "live"] as const;

function archivedContact(playerId: string): { email: string; phone: string } {
  const seed = createHash("sha256").update(`archived:${playerId}:${Date.now()}`).digest("hex");
  const digits = seed
    .split("")
    .map((ch) => (Number.parseInt(ch, 16) % 10).toString())
    .join("")
    .slice(0, 9);
  return {
    email: `archived+${playerId.replace(/-/g, "").slice(0, 16)}@partner.invalid`,
    phone: `8${digits}`,
  };
}

/**
 * Soft-remove a guest player from the partner Players directory.
 * Blocks when they still hold an active registration or roster slot on a live/upcoming event.
 */
export async function archivePartnerPlayer(input: {
  partnerId: string;
  playerId: string;
}): Promise<void> {
  const db = getDb();
  const [player] = await db
    .select({
      id: partnerPlayers.id,
      partnerId: partnerPlayers.partnerId,
      archivedAt: partnerPlayers.archivedAt,
      fullName: partnerPlayers.fullName,
    })
    .from(partnerPlayers)
    .where(
      and(eq(partnerPlayers.id, input.playerId), eq(partnerPlayers.partnerId, input.partnerId)),
    )
    .limit(1);

  if (!player) {
    throw new AppError("Player not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (player.archivedAt) {
    return;
  }

  const [activeCaptainReg] = await db
    .select({ id: partnerTournamentRegistrations.id })
    .from(partnerTournamentRegistrations)
    .where(
      and(
        eq(partnerTournamentRegistrations.partnerId, input.partnerId),
        eq(partnerTournamentRegistrations.captainPartnerPlayerId, input.playerId),
        inArray(partnerTournamentRegistrations.status, [...ACTIVE_REGISTRATION_STATUSES]),
      ),
    )
    .limit(1);

  const [activeMemberReg] = await db
    .select({ id: partnerTournamentRegistrations.id })
    .from(partnerTournamentRegistrationMembers)
    .innerJoin(
      partnerTournamentRegistrations,
      eq(partnerTournamentRegistrations.id, partnerTournamentRegistrationMembers.registrationId),
    )
    .where(
      and(
        eq(partnerTournamentRegistrationMembers.partnerPlayerId, input.playerId),
        eq(partnerTournamentRegistrations.partnerId, input.partnerId),
        inArray(partnerTournamentRegistrations.status, [...ACTIVE_REGISTRATION_STATUSES]),
      ),
    )
    .limit(1);

  if (activeCaptainReg || activeMemberReg) {
    throw new AppError(
      "This player still has an active tournament registration. Cancel or finish that registration first.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  const [activeRoster] = await db
    .select({
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      status: tournaments.status,
    })
    .from(tournamentTeamMembers)
    .innerJoin(tournamentTeams, eq(tournamentTeams.id, tournamentTeamMembers.teamId))
    .innerJoin(tournaments, eq(tournaments.id, tournamentTeams.tournamentId))
    .where(
      and(
        eq(tournamentTeamMembers.partnerPlayerId, input.playerId),
        eq(tournaments.partnerId, input.partnerId),
        inArray(tournaments.status, [...ACTIVE_TOURNAMENT_STATUSES]),
      ),
    )
    .limit(1);

  if (activeRoster) {
    throw new AppError(
      `This player is still on the roster for "${activeRoster.tournamentName}" (${activeRoster.status}). Remove them from that event before deleting.`,
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  const contact = archivedContact(input.playerId);
  const [updated] = await db
    .update(partnerPlayers)
    .set({
      archivedAt: new Date(),
      email: contact.email,
      phone: contact.phone,
    })
    .where(
      and(
        eq(partnerPlayers.id, input.playerId),
        eq(partnerPlayers.partnerId, input.partnerId),
        isNull(partnerPlayers.archivedAt),
      ),
    )
    .returning({ id: partnerPlayers.id });

  if (!updated) {
    throw new AppError("Could not remove player. Please refresh and try again.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  log.info("Partner player archived from directory", {
    partnerId: input.partnerId,
    playerId: input.playerId,
    fullName: player.fullName,
  });
}
