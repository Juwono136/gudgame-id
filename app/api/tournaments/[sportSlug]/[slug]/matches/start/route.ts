import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { assertHostControlsAccess, buildTournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { getUserTeamInTournament } from "@/lib/tournaments/reclub/teams";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { startReclubRound } from "@/lib/tournaments/reclub/matches";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamAId: z.string().uuid(),
  teamBId: z.string().uuid(),
  courtId: z.string().uuid().optional(),
  playType: z.enum(["round", "friendly"]).optional(),
  bracketMatchId: z.string().uuid().optional(),
  sessionRound: z.number().int().positive().optional(),
});

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

    const userTeamId = await getUserTeamInTournament(tournament.id, userId);
    const participant = buildTournamentParticipantContext({
      userId,
      userTeamId,
      roles,
      tournamentCreatedBy: tournament.createdBy,
    });
    assertHostControlsAccess(participant);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Select two teams to start", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    if (parsed.data.teamAId === parsed.data.teamBId) {
      throw new AppError("Teams must be different", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const match = await startReclubRound(
      tournament,
      userId,
      parsed.data.teamAId,
      parsed.data.teamBId,
      {
        courtId: parsed.data.courtId,
        playType: parsed.data.playType,
        bracketMatchId: parsed.data.bracketMatchId,
        sessionRound: parsed.data.sessionRound,
      },
    );
    return jsonSuccess({ match }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
