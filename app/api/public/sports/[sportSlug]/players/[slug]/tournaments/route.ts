import { jsonError, jsonSuccess } from "@/lib/api/response";
import { listPlayerTournaments } from "@/lib/account/player-competition/list-tournaments";
import { getUserRoleAssignments } from "@/lib/roles/sync";
import { AppError } from "@/lib/errors";
import { resolvePublicPlayerOwner } from "@/lib/wiki/resolve-public-player-owner";
import { playerTournamentsListQuerySchema } from "@/lib/validations/player-competition";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sportSlug: string; slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { sportSlug, slug } = await context.params;
    const owner = await resolvePublicPlayerOwner(sportSlug, slug);
    const url = new URL(request.url);
    const parsed = playerTournamentsListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      throw new AppError("Invalid query parameters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    const roles = await getUserRoleAssignments(owner.ownerUserId);
    const list = await listPlayerTournaments(owner.ownerUserId, roles, {
      ...parsed.data,
      scope: "all",
      sportSlug: owner.sportSlug,
    });

    return jsonSuccess({
      ...list,
      player: {
        slug: owner.playerSlug,
        displayName: owner.displayName,
        sportSlug: owner.sportSlug,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
