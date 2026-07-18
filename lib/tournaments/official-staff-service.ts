import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournaments } from "@/db/schema/tournaments";
import { AppError } from "@/lib/errors";
import type { AppRole } from "@/lib/roles/constants";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { canManageTournament } from "@/lib/tournaments/permissions";
import {
  getOfficialTournamentStaff,
  type OfficialTournamentStaffMember,
  type OfficialTournamentStaffRole,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

function assertCanManageOfficialStaff(
  tournament: TournamentDetail,
  roles: AppRole[],
  userId: string,
): void {
  if (tournament.tournamentType !== "official") {
    throw new AppError("Staff invites are only available for official tournaments", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }

  if (!canManageTournament(roles, tournament.createdBy, userId)) {
    throw new AppError("Only the tournament owner can manage scoring staff", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function listOfficialTournamentStaff(
  tournament: TournamentDetail,
): OfficialTournamentStaffMember[] {
  return getOfficialTournamentStaff(tournament);
}

export async function addOfficialTournamentStaff(input: {
  tournament: TournamentDetail;
  actorUserId: string;
  roles: AppRole[];
  email: string;
  role: OfficialTournamentStaffRole;
}): Promise<OfficialTournamentStaffMember[]> {
  assertCanManageOfficialStaff(input.tournament, input.roles, input.actorUserId);

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("Email is required", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  const [target] = await getDb()
    .select({ id: user.id, email: user.email, name: user.name, isActive: user.isActive })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!target) {
    throw new AppError("User not found. Ask them to create an account first.", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }

  if (!target.isActive) {
    throw new AppError("This user account is inactive", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }

  if (target.id === input.tournament.createdBy) {
    throw new AppError("The tournament owner already has full access", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const current = getOfficialTournamentStaff(input.tournament);
  if (current.some((member) => member.userId === target.id)) {
    throw new AppError("This user is already on the scoring team", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  const next: OfficialTournamentStaffMember[] = [
    ...current,
    {
      userId: target.id,
      email: target.email.toLowerCase(),
      name: target.name,
      role: input.role,
      invitedAt: new Date().toISOString(),
      invitedByUserId: input.actorUserId,
    },
  ];

  await updateTournamentStaff(input.tournament, next);
  return next;
}

export async function removeOfficialTournamentStaff(input: {
  tournament: TournamentDetail;
  actorUserId: string;
  roles: AppRole[];
  staffUserId: string;
}): Promise<OfficialTournamentStaffMember[]> {
  assertCanManageOfficialStaff(input.tournament, input.roles, input.actorUserId);

  const current = getOfficialTournamentStaff(input.tournament);
  const next = current.filter((member) => member.userId !== input.staffUserId);
  if (next.length === current.length) {
    throw new AppError("Staff member not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  await updateTournamentStaff(input.tournament, next);
  return next;
}

async function updateTournamentStaff(
  tournament: TournamentDetail,
  staff: OfficialTournamentStaffMember[],
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ settings: tournaments.settings })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  const settings = {
    ...((row?.settings as Record<string, unknown> | null) ??
      (tournament.settings as Record<string, unknown>) ??
      {}),
  } as Record<string, unknown>;

  if (staff.length) {
    settings.officialStaff = staff;
  } else {
    delete settings.officialStaff;
  }

  await db
    .update(tournaments)
    .set({ settings, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));

  await invalidateTournamentCaches(tournament.sportSlug, tournament.slug);
}
