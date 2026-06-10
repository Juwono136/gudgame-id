import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { joinReclubTournament } from "@/lib/tournaments/registration/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamName: z.string().trim().max(120).optional(),
});

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

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    const teamName = parsed.success ? parsed.data.teamName : undefined;

    const result = await joinReclubTournament(tournament, userId, teamName);
    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
