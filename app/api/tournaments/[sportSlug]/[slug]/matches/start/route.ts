import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { resolveManageParticipantContext } from "@/lib/tournaments/manage-access";
import { assertHostControlsAccess } from "@/lib/tournaments/participant-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { startReclubRound, resolveSquadIdForPlayer } from "@/lib/tournaments/reclub/matches";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamAId: z.string().uuid(),
  teamBId: z.string().uuid(),
  courtId: z.string().uuid().optional(),
  playType: z.enum(["round", "friendly"]).optional(),
  bracketMatchId: z.string().uuid().optional(),
  sessionRound: z.number().int().positive().optional(),
  americanoPairing: z
    .object({
      sideA: z.tuple([z.string().uuid(), z.string().uuid()]),
      sideB: z.tuple([z.string().uuid(), z.string().uuid()]),
    })
    .optional(),
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

    const { participant } = await resolveManageParticipantContext(tournament, userId, roles);
    assertHostControlsAccess(participant);

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Select two teams to start", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    if (parsed.data.teamAId === parsed.data.teamBId && !parsed.data.americanoPairing) {
      throw new AppError("Teams must be different", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    let teamAId = parsed.data.teamAId;
    let teamBId = parsed.data.teamBId;
    const americanoPairing = parsed.data.americanoPairing;

    if (americanoPairing) {
      const sideIds = [...americanoPairing.sideA, ...americanoPairing.sideB];
      if (new Set(sideIds).size < 4) {
        throw new AppError("Americano courts need four distinct players", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }

      const [resolvedA, resolvedB] = await Promise.all([
        resolveSquadIdForPlayer(tournament.id, americanoPairing.sideA[0]),
        resolveSquadIdForPlayer(tournament.id, americanoPairing.sideB[0]),
      ]);

      if (!resolvedA || !resolvedB) {
        throw new AppError("Could not resolve squads for Americano pairing", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }

      teamAId = resolvedA;
      teamBId = resolvedB;
    }

    const match = await startReclubRound(
      tournament,
      userId,
      teamAId,
      teamBId,
      {
        courtId: parsed.data.courtId,
        playType: parsed.data.playType,
        bracketMatchId: parsed.data.bracketMatchId,
        sessionRound: parsed.data.sessionRound,
        americanoPairing,
      },
    );
    return jsonSuccess({ match }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
