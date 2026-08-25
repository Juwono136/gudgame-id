import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { startOfficialRegistration } from "@/lib/tournaments/registration/service";
import {
  normalizeOfficialRosterMembers,
  startOfficialRegistrationSchema,
} from "@/lib/validations/official-registration";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    await enforceRateLimit({
      key: `tournament-register:${userId}`,
      limit: 10,
      windowSeconds: 60,
    });
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const body = await request.json();
    const parsed = startOfficialRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid registration data", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const [dbUser] = await getDb()
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!dbUser?.email) {
      throw new AppError("Account email is required for registration", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const members = normalizeOfficialRosterMembers(parsed.data);
    const teamName =
      parsed.data.teamName.trim() ||
      (tournament.playersPerTeam === 1 ? dbUser.email.split("@")[0]! : "");

    if ((tournament.playersPerTeam ?? 2) > 1 && teamName.trim().length < 2) {
      throw new AppError("Team name is required", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const result = await startOfficialRegistration(tournament, userId, dbUser.email, {
      teamName: teamName.trim() || "Solo",
      members,
    });

    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
