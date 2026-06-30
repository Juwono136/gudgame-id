import { cookies } from "next/headers";
import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getServerSession } from "@/lib/auth/session";
import {
  assertDashboardSportSlugAllowed,
  resolveDashboardSportContext,
} from "@/lib/dashboard/sport-context";
import { DASHBOARD_SPORT_COOKIE } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(50),
});

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const ctx = await resolveDashboardSportContext(session.user.id);
    return jsonSuccess({
      sportSlug: ctx.sportSlug,
      sportId: ctx.sportId,
      sports: ctx.availableSports,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const { slug } = bodySchema.parse(await request.json());
    await assertDashboardSportSlugAllowed(session.user.id, slug);

    const cookieStore = await cookies();
    cookieStore.set(DASHBOARD_SPORT_COOKIE, slug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return jsonSuccess({ slug });
  } catch (error) {
    return jsonError(error);
  }
}
