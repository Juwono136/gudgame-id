import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getServerSession } from "@/lib/auth/session";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { updateBracketLiveScore, listBracketMatches } from "@/lib/tournaments/brackets/service";
import {
  assertCanScoreBracketMatch,
  buildTournamentParticipantContext,
} from "@/lib/tournaments/participant-access";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
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
  action: z.enum(["set", "increment", "decrement", "set_points", "next_game"]).optional(),
  side: z.enum(["a", "b"]).optional(),
  scorerName: optionalScorerNameSchema,
  scorerUserId: optionalAuthUserIdSchema,
  targetPoints: z.coerce.number().int().min(0).max(100).optional(),
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

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw zodErrorToAppError(parsed.error);
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

    const matchId = parseEntityIdParam(parsed.data.matchId, "match id");
    const matches = await listBracketMatches(tournament.id);
    const target = matches.find((m) => m.id === matchId);
    if (!target) {
      throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (!participant.isRuntimeManager) {
      throw new AppError("Only the owner or invited scoring staff can update scores", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }
    assertCanScoreBracketMatch(participant, target);

    const session = await getServerSession();
    const match = await updateBracketLiveScore(
      tournament,
      matchId,
      userId,
      session?.user?.name ?? null,
      {
        scoreA: parsed.data.scoreA,
        scoreB: parsed.data.scoreB,
        action: parsed.data.action,
        side: parsed.data.side,
        scorerName: parsed.data.scorerName,
        scorerUserId: parsed.data.scorerUserId,
        targetPoints: parsed.data.targetPoints,
      },
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
