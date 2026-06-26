import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  addOfficialTournamentStaff,
  listOfficialTournamentStaff,
} from "@/lib/tournaments/official-staff-service";
import { canManageTournament } from "@/lib/tournaments/permissions";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const addStaffSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(["host", "scorekeeper"]).default("scorekeeper"),
});

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

    if (!canManageTournament(roles, tournament.createdBy, userId)) {
      throw new AppError("Only the tournament owner can view scoring staff", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    return jsonSuccess({ staff: listOfficialTournamentStaff(tournament) });
  } catch (error) {
    return jsonError(error);
  }
}

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

    const parsed = addStaffSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Enter a valid email and access level", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const staff = await addOfficialTournamentStaff({
      tournament,
      actorUserId: userId,
      roles,
      email: parsed.data.email,
      role: parsed.data.role,
    });

    return jsonSuccess({ staff }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
