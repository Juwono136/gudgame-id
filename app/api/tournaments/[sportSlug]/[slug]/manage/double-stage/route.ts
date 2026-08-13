import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  buildDoubleStageOverview,
  initializeDoubleStageGroups,
  reconcileDoubleStageGroups,
  saveManualDoubleStageAssignments,
} from "@/lib/tournaments/double-stage/service";
import { assertGroupStageTournament } from "@/lib/tournaments/format-guards";
import { assertTournamentManagePageAccess } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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
    if (tournament.status === "live") {
      await initializeDoubleStageGroups(tournament);
      await reconcileDoubleStageGroups(tournament);
    }
    const overview = await buildDoubleStageOverview(tournament);

    return jsonSuccess({ overview });
  } catch (error) {
    return jsonError(error);
  }
}

const assignmentSchema = z.object({
  assignments: z
    .array(
      z.object({
        groupName: z.string().trim().min(1).max(40),
        teamIds: z.array(z.string().uuid()).min(2),
      }),
    )
    .min(1),
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
    assertGroupStageTournament(tournament);

    await assertTournamentManagePageAccess(tournament, userId, roles);
    const body = assignmentSchema.parse(await request.json());
    const result = await saveManualDoubleStageAssignments(tournament, body.assignments);
    const overview = await buildDoubleStageOverview(tournament);
    return jsonSuccess({ ...result, overview });
  } catch (error) {
    return jsonError(error);
  }
}
