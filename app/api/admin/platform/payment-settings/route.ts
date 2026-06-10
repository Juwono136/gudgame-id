import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import {
  getPlatformPaymentSettings,
  updatePlatformPaymentSettings,
  type PlatformPaymentSettings,
} from "@/lib/tournaments/payments/platform-settings";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  platformFeeIdr: z.coerce.number().int().min(0).max(10_000_000),
  processingFeePercent: z.coerce.number().min(0).max(25),
});

export async function GET() {
  try {
    await requireWikiManagementAccess();
    const settings = await getPlatformPaymentSettings();
    return jsonSuccess({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Validation failed", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const settings: PlatformPaymentSettings = parsed.data;
    const updated = await updatePlatformPaymentSettings(settings, ctx.userId);
    return jsonSuccess({ settings: updated });
  } catch (error) {
    return jsonError(error);
  }
}
