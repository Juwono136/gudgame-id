import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema/sports";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { assertCanCreateTournamentType } from "@/lib/tournaments/permissions";
import { createTournament } from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";
import { cookies } from "next/headers";
import { ADMIN_SPORT_COOKIE } from "@/lib/roles/constants";

export const runtime = "nodejs";

async function resolveHostSportId(): Promise<number> {
  const cookieStore = await cookies();
  const slug = cookieStore.get(ADMIN_SPORT_COOKIE)?.value ?? "padel";
  const [sport] = await getDb()
    .select({ id: sports.id })
    .from(sports)
    .where(eq(sports.slug, slug))
    .limit(1);
  if (!sport) {
    throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  return sport.id;
}

export async function GET() {
  try {
    const { userId } = await requireHostDashboardAccess();
    const sportId = await resolveHostSportId();
    const { listHostTournaments } = await import("@/lib/tournaments/workspace/service");
    const items = await listHostTournaments(userId, sportId);
    return jsonSuccess({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, roles } = await requireHostDashboardAccess();
    const body = await request.json();
    const parsed = tournamentUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }

    assertCanCreateTournamentType(roles, parsed.data.tournamentType);
    const sportId = await resolveHostSportId();
    const tournament = await createTournament(sportId, userId, parsed.data);
    return jsonSuccess({ tournament }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
