import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { sports } from "@/db/schema";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/admin/session";
import { ADMIN_SPORT_COOKIE } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(50),
});

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const { slug } = bodySchema.parse(await request.json());

    const [sport] = await getDb()
      .select({ slug: sports.slug })
      .from(sports)
      .where(eq(sports.slug, slug))
      .limit(1);

    if (!sport) {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SPORT_COOKIE, slug, {
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
