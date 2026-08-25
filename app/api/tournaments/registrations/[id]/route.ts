import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
} from "@/db/schema/tournament-registration";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import {
  getRegistrationDetail,
  updateOfficialRegistration,
} from "@/lib/tournaments/registration/service";
import { expireRegistrationIfOverdue } from "@/lib/tournaments/registration/payment-expiry";
import {
  normalizeOfficialRosterMembers,
  updateOfficialRegistrationSchema,
} from "@/lib/validations/official-registration";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = parseEntityIdParam(id, "registration id");

    const detail = await getRegistrationDetail(registrationId);
    if (!detail) {
      throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    await expireRegistrationIfOverdue(registrationId);
    const refreshed = (await getRegistrationDetail(registrationId)) ?? detail;

    if (detail.registeredByUserId !== userId) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const [reg] = await getDb()
      .select({ teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, registrationId))
      .limit(1);

    const members =
      reg?.teamId != null
        ? await getDb()
            .select({
              userId: tournamentTeamMembers.userId,
              displayName: sql<string>`coalesce(
                nullif(${user.nickname}, ''),
                ${user.name},
                ${tournamentTeamMembers.pendingDisplayName},
                'Player'
              )`,
              role: tournamentTeamMembers.role,
              slotIndex: tournamentTeamMembers.slotIndex,
              kind: sql<"user" | "pending">`case when ${tournamentTeamMembers.userId} is not null then 'user' else 'pending' end`,
              pendingEmail: tournamentTeamMembers.pendingEmail,
              claimStatus: sql<"claimed" | "pending" | null>`case
                when ${tournamentTeamMembers.claimedAt} is not null then 'claimed'
                when ${tournamentTeamMembers.pendingEmail} is not null then 'pending'
                else null end`,
            })
            .from(tournamentTeamMembers)
            .leftJoin(user, eq(tournamentTeamMembers.userId, user.id))
            .where(eq(tournamentTeamMembers.teamId, reg.teamId))
            .orderBy(tournamentTeamMembers.slotIndex)
        : [];

    return jsonSuccess({
      registration: {
        ...refreshed,
        startsAt: refreshed.startsAt?.toISOString() ?? null,
        endsAt: refreshed.endsAt?.toISOString() ?? null,
        paidAt: refreshed.paidAt?.toISOString() ?? null,
        paymentDueAt: refreshed.paymentDueAt?.toISOString() ?? null,
        members,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = parseEntityIdParam(id, "registration id");

    const json = await request.json();
    const parsed = updateOfficialRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const tournament = await getTournamentBySlug(parsed.data.sportSlug, parsed.data.slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const result = await updateOfficialRegistration(
      tournament,
      registrationId,
      userId,
      {
        teamName: parsed.data.teamName,
        members: normalizeOfficialRosterMembers(parsed.data),
      },
    );

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
