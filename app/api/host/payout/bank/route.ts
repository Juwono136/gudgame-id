import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import {
  addHostBankAccount,
  getHostBankPayoutProfile,
  updateHostPayoutSchedule,
} from "@/lib/payments/host-payout/accounts";
import { addBankAccountSchema, payoutScheduleSchema } from "@/lib/payments/host-payout/schemas";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireHostDashboardAccess();
    const profile = await getHostBankPayoutProfile(ctx.userId);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireHostDashboardAccess();
    const body = await request.json();
    const parsed = addBankAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid bank account details", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: parsed.error.flatten().fieldErrors },
      });
    }
    const profile = await addHostBankAccount(ctx.userId, parsed.data);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireHostDashboardAccess();
    const body = await request.json();
    const parsed = payoutScheduleSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid payout schedule", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    const profile = await updateHostPayoutSchedule(ctx.userId, parsed.data.payoutSchedule);
    return jsonSuccess({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
