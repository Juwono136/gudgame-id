import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { joinFunMatchTournament } from "@/lib/tournaments/registration/service";
import { funMatchJoinSchema } from "@/lib/validations/tournaments";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const json = await request.json();
    const parsed = funMatchJoinSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("Choose to join an existing squad or create a new one.", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const result = await joinFunMatchTournament(tournament, userId, parsed.data);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
