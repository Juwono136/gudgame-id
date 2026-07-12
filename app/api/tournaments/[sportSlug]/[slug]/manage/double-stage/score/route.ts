import { getServerSession } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import {
  buildDoubleStageOverview,
  recordGroupStageScore,
  startGroupStageMatch,
  updateGroupStageLiveScore,
} from "@/lib/tournaments/double-stage/service";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    matchId: z.string().uuid(),
    courtId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("update"),
    matchId: z.string().uuid(),
    scoreA: z.coerce.number().int().min(0),
    scoreB: z.coerce.number().int().min(0),
    scoreAction: z.enum(["increment", "decrement", "set"]).optional(),
    side: z.enum(["a", "b"]).optional(),
    scorerName: z.string().trim().min(1).max(120).optional(),
    scorerUserId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("record"),
    matchId: z.string().uuid(),
    scoreA: z.coerce.number().int().min(0),
    scoreB: z.coerce.number().int().min(0),
    durationSeconds: z.coerce.number().int().min(0).optional(),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (tournament.format !== "double_stage") {
      throw new AppError("Not a double stage tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    await assertTournamentManagePageAccess(tournament, userId, roles);
    assertTournamentLiveForScoring(tournament);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Invalid request", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    if (parsed.data.action === "start") {
      const match = await startGroupStageMatch(
        tournament,
        parsed.data.matchId,
        userId,
        parsed.data.courtId,
      );
      const overview = await buildDoubleStageOverview(tournament);
      return jsonSuccess({ match, overview });
    }

    if (parsed.data.action === "update") {
      const session = await getServerSession();
      const match = await updateGroupStageLiveScore(
        tournament,
        parsed.data.matchId,
        userId,
        session?.user?.name ?? null,
        {
          scoreA: parsed.data.scoreA,
          scoreB: parsed.data.scoreB,
          scoreAction: parsed.data.scoreAction,
          side: parsed.data.side,
          scorerName: parsed.data.scorerName,
          scorerUserId: parsed.data.scorerUserId,
        },
      );
      const overview = await buildDoubleStageOverview(tournament);
      return jsonSuccess({ match, overview });
    }

    const session = await getServerSession();
    const match = await recordGroupStageScore(
      tournament,
      parsed.data.matchId,
      userId,
      session?.user?.name ?? null,
      {
        scoreA: parsed.data.scoreA,
        scoreB: parsed.data.scoreB,
        durationSeconds: parsed.data.durationSeconds,
      },
    );
    const overview = await buildDoubleStageOverview(
      (await getTournamentBySlug(sportSlug, slug))!,
    );
    return jsonSuccess({ match, overview });
  } catch (error) {
    return jsonError(error);
  }
}
