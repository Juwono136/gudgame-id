import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  canManageBracketSetup,
  canManageTournament,
} from "@/lib/tournaments/permissions";
import { generateTournamentBracket } from "@/lib/tournaments/brackets/generate";
import { getActiveAccessGrantRole } from "@/lib/tournaments/invitations/access-grants";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { bracketGenerateSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

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

    const grantRole = await getActiveAccessGrantRole(tournament.id, userId);
    if (!canManageBracketSetup(roles, tournament, userId, grantRole)) {
      throw new AppError("Only the tournament owner or invited staff can generate brackets", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    if (!canManageTournament(roles, tournament.createdBy, userId) && !grantRole) {
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bracketGenerateSchema.safeParse(body);
    const seedMode = parsed.success ? parsed.data.seedMode : "manual";

    const result = await generateTournamentBracket(tournament, { seedMode });
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
