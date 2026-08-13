import { getServerSession } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertGroupStageTournament } from "@/lib/tournaments/format-guards";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import {
  buildDoubleStageOverview,
  recordGroupStageScore,
  startGroupStageMatch,
  updateGroupStageLiveScore,
} from "@/lib/tournaments/double-stage/service";
import { getTournamentBySlug, type TournamentDetail } from "@/lib/tournaments/service";
import {
  optionalAuthUserIdSchema,
  optionalScorerNameSchema,
} from "@/lib/validations/scoring";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    matchId: z.string().uuid(),
    courtId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("update"),
    matchId: z.string().uuid(),
    scoreA: z.coerce.number().int().min(0).default(0),
    scoreB: z.coerce.number().int().min(0).default(0),
    scoreAction: z
      .enum(["increment", "decrement", "set", "set_points", "next_game"])
      .default("increment"),
    side: z.enum(["a", "b"]).optional(),
    scorerName: optionalScorerNameSchema,
    scorerUserId: optionalAuthUserIdSchema,
    servingSide: z.enum(["a", "b"]).optional(),
    serverName: optionalScorerNameSchema,
    serverUserId: optionalAuthUserIdSchema,
    targetPoints: z.coerce.number().int().min(0).max(100).optional(),
  }),
  z.object({
    action: z.literal("record"),
    matchId: z.string().uuid(),
    scoreA: z.coerce.number().int().min(0),
    scoreB: z.coerce.number().int().min(0),
    durationSeconds: z.coerce.number().int().min(0).optional(),
  }),
]);

async function optionalOverview(tournament: TournamentDetail) {
  try {
    return await buildDoubleStageOverview(tournament);
  } catch {
    // Live scoring must not fail after a successful write because overview rebuild failed.
    return undefined;
  }
}

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

    assertGroupStageTournament(tournament);

    await assertTournamentManagePageAccess(tournament, userId, roles);
    assertTournamentLiveForScoring(tournament);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw zodErrorToAppError(parsed.error);
    }

    if (parsed.data.action === "start") {
      const match = await startGroupStageMatch(
        tournament,
        parsed.data.matchId,
        userId,
        parsed.data.courtId,
      );
      const overview = await optionalOverview(tournament);
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
          servingSide: parsed.data.servingSide,
          serverName: parsed.data.serverName,
          serverUserId: parsed.data.serverUserId,
          targetPoints: parsed.data.targetPoints,
        },
      );
      // Live +/- only needs the updated match — skip overview rebuild for speed/reliability.
      return jsonSuccess({ match });
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
    const refreshed = (await getTournamentBySlug(sportSlug, slug)) ?? tournament;
    const overview = await optionalOverview(refreshed);
    return jsonSuccess({ match, overview });
  } catch (error) {
    return jsonError(error);
  }
}
