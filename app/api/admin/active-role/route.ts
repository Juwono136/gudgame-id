import { cookies } from "next/headers";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminSessionContext } from "@/lib/admin/session";
import { ACTIVE_ROLE_COOKIE, isAppRole } from "@/lib/roles/constants";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const bodySchema = z.object({
  role: z.string(),
});

export async function POST(request: Request) {
  try {
    const ctx = await getAdminSessionContext();
    if (!ctx) {
      throw new AppError("Admin access required", {
        code: "FORBIDDEN",
        statusCode: 403,
      });
    }

    const { role } = bodySchema.parse(await request.json());
    if (!isAppRole(role) || !ctx.roles.includes(role)) {
      throw new AppError("Invalid role for your account", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ROLE_COOKIE, role, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return jsonSuccess({ activeRole: role });
  } catch (error) {
    return jsonError(error);
  }
}
