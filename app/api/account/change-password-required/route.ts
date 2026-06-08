import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { auth } from "@/lib/auth/server";
import { getServerSession } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { AppError } from "@/lib/errors";
import { passwordSchema } from "@/lib/validations/auth";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const body = bodySchema.parse(await request.json());

    const [dbUser] = await getDb()
      .select({ mustChangePassword: user.mustChangePassword })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!dbUser?.mustChangePassword) {
      throw new AppError("Password change is not required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    try {
      await auth.api.changePassword({
        body: {
          currentPassword: body.currentPassword,
          newPassword: body.password,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      });
    } catch {
      throw new AppError("Could not update password. Check your temporary password.", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    await getDb()
      .update(user)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    return jsonSuccess({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
