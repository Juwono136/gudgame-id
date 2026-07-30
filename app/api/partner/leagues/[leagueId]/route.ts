import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  addPartnerLeagueTeam,
  createPartnerLeagueMatch,
  deletePartnerLeague,
  getPartnerLeagueById,
  updatePartnerLeague,
} from "@/lib/partners/leagues";
import { getPrimaryPartnerForUser } from "@/lib/partners/service";
import { z } from "zod";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ leagueId: string }> };

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  })
  .refine((v) => v.name != null || v.status != null, {
    message: "Provide a name and/or status to update",
  });

async function requirePartner() {
  const ctx = await requireApiPartnerDashboardAccess();
  const partner = await getPrimaryPartnerForUser(ctx.userId);
  if (!partner) {
    throw new AppError("No partner organization linked", {
      code: "NOT_FOUND",
      statusCode: 404,
    });
  }
  return { ctx, partner };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { partner } = await requirePartner();
    const { leagueId } = await context.params;
    const league = await getPartnerLeagueById(partner.id, leagueId);
    if (!league) {
      throw new AppError("League not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    return jsonSuccess(league);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { partner } = await requirePartner();
    const { leagueId } = await context.params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const league = await updatePartnerLeague({
      partnerId: partner.id,
      leagueId,
      name: parsed.data.name,
      status: parsed.data.status,
    });
    return jsonSuccess(league);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { partner } = await requirePartner();
    const { leagueId } = await context.params;
    await deletePartnerLeague({ partnerId: partner.id, leagueId });
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { partner } = await requirePartner();
    const { leagueId } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      name?: string;
      teamAId?: string;
      teamBId?: string;
    };

    if (body.action === "add_team") {
      const team = await addPartnerLeagueTeam({
        partnerId: partner.id,
        leagueId,
        name: typeof body.name === "string" ? body.name : "",
      });
      return jsonSuccess(team, 201);
    }

    if (body.action === "create_match") {
      if (!body.teamAId || !body.teamBId) {
        return Response.json(
          {
            error: "Validation failed",
            fieldErrors: { teams: ["Select two teams"] },
          },
          { status: 422 },
        );
      }
      const match = await createPartnerLeagueMatch({
        partnerId: partner.id,
        leagueId,
        teamAId: body.teamAId,
        teamBId: body.teamBId,
      });
      return jsonSuccess(match, 201);
    }

    throw new AppError("Unknown action", { code: "VALIDATION_ERROR", statusCode: 422 });
  } catch (error) {
    return jsonError(error);
  }
}
