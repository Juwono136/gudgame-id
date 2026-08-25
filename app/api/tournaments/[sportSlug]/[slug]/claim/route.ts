import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import {
  claimRosterSlot,
  previewRosterClaim,
} from "@/lib/tournaments/registration/claim";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    await params;
    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (!token) {
      throw new AppError("Claim token is required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    await enforceRateLimit({
      key: `roster-claim-preview:${token.slice(0, 16)}`,
      limit: 30,
      windowSeconds: 60,
    });

    const preview = await previewRosterClaim(token);
    return jsonSuccess(preview);
  } catch (error) {
    return jsonError(error);
  }
}

const bodySchema = z.object({
  token: z.string().min(20).max(200),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    await params;
    const { userId } = await requireApiRoleGuardContext();
    await enforceRateLimit({
      key: `roster-claim:${userId}`,
      limit: 10,
      windowSeconds: 60,
    });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid claim request", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const [dbUser] = await getDb()
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!dbUser?.email) {
      throw new AppError("Account email is required to claim a roster slot", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const result = await claimRosterSlot({
      token: parsed.data.token,
      userId,
      userEmail: dbUser.email,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
