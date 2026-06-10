import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
} from "@/db/schema/tournament-registration";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { getRegistrationDetail } from "@/lib/tournaments/registration/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = Number(id);
    if (!Number.isFinite(registrationId) || registrationId <= 0) {
      throw new AppError("Invalid registration id", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const detail = await getRegistrationDetail(registrationId);
    if (!detail) {
      throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
    }

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
            .select({ displayName: user.name, userId: user.id })
            .from(tournamentTeamMembers)
            .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
            .where(eq(tournamentTeamMembers.teamId, reg.teamId))
        : [];

    return jsonSuccess({
      registration: {
        ...detail,
        startsAt: detail.startsAt?.toISOString() ?? null,
        endsAt: detail.endsAt?.toISOString() ?? null,
        paidAt: detail.paidAt?.toISOString() ?? null,
        members,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
