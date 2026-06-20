import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { updateBracketLiveScore, listBracketMatches } from "@/lib/tournaments/brackets/service";
import {
  assertCanScoreBracketMatch,
  buildTournamentParticipantContext,
} from "@/lib/tournaments/participant-access";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.coerce.number().int().min(0).max(99),
  scoreB: z.coerce.number().int().min(0).max(99),
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
      throw new AppError("Invalid scores", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const userTeamId = await getUserTeamInTournament(tournament.id, userId);
    const participant = buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournamentCreatedBy: tournament.createdBy,
    });

    const matchId = parseEntityIdParam(parsed.data.matchId, "match id");
    const matches = await listBracketMatches(tournament.id);
    const target = matches.find((m) => m.id === matchId);
    if (!target) {
      throw new AppError("Match not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    assertCanScoreBracketMatch(participant, target);

    const match = await updateBracketLiveScore(
      tournament,
      matchId,
      parsed.data.scoreA,
      parsed.data.scoreB,
    );

    return jsonSuccess({ match });
  } catch (error) {
    return jsonError(error);
  }
}
