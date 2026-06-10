import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { startOfficialRegistration } from "@/lib/tournaments/registration/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamName: z.string().trim().min(2).max(120),
  memberUserIds: z.array(z.string().min(1)).max(8).default([]),
});

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
    const parsed = bodySchema.safeParse(body);
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
      throw new AppError("Account email is required for payment", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const result = await startOfficialRegistration(
      tournament,
      userId,
      dbUser.email,
      parsed.data,
    );

    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
