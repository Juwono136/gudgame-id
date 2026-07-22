import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import {
  assertCourtsideScoringAccess,
  buildTournamentParticipantContext,
} from "@/lib/tournaments/participant-access";
import { updateReclubLiveScore } from "@/lib/tournaments/reclub/live-score";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import {
  optionalAuthUserIdSchema,
  optionalScorerNameSchema,
} from "@/lib/validations/scoring";
import { zodErrorToAppError } from "@/lib/validations/format-zod-error";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.coerce.number().int().min(0).max(99),
  scoreB: z.coerce.number().int().min(0).max(99),
  action: z.enum(["set", "increment", "decrement"]).optional(),
  side: z.enum(["a", "b"]).optional(),
  scorerName: optionalScorerNameSchema,
  scorerUserId: optionalAuthUserIdSchema,
});

export async function PATCH(
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

    const userTeamId = await getUserTeamInTournament(tournament.id, userId);
    const grantRole = await getActiveAccessGrantRole(tournament.id, userId);
    const participant = buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournamentCreatedBy: tournament.createdBy,
      grantRole,
    });
    assertCourtsideScoringAccess(participant);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw zodErrorToAppError(parsed.error);
    }

    const session = await getServerSession();
    const match = await updateReclubLiveScore(
      tournament,
      parsed.data.matchId,
      userId,
      session?.user?.name ?? null,
      {
        scoreA: parsed.data.scoreA,
        scoreB: parsed.data.scoreB,
        action: parsed.data.action,
        side: parsed.data.side,
        scorerName: parsed.data.scorerName,
        scorerUserId: parsed.data.scorerUserId,
      },
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
