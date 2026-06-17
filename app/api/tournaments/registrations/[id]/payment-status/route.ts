import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournamentRegistrations } from "@/db/schema/tournament-registration";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { expireRegistrationIfOverdue } from "@/lib/tournaments/registration/payment-expiry";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = Number(id);
    if (!Number.isFinite(registrationId)) {
      throw new AppError("Invalid registration id", { code: "VALIDATION_ERROR", statusCode: 400 });
    }

    const [reg] = await getDb()
      .select({
        status: tournamentRegistrations.status,
        registeredByUserId: tournamentRegistrations.registeredByUserId,
      })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, registrationId))
      .limit(1);

    if (!reg || reg.registeredByUserId !== userId) {
      throw new AppError("Not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const windowState = await expireRegistrationIfOverdue(registrationId);
    if (windowState === "expired") {
      const [expiredReg] = await getDb()
        .select({ status: tournamentRegistrations.status })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.id, registrationId))
        .limit(1);
      return jsonSuccess({
        registrationStatus: expiredReg?.status ?? "cancelled",
        paymentStatus: "expired",
        paid: false,
        expired: true,
        metadata: {},
      });
    }

    const [freshReg] = await getDb()
      .select({ status: tournamentRegistrations.status })
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, registrationId))
      .limit(1);

    const [payment] = await getDb()
      .select({
        status: tournamentPayments.status,
        metadata: tournamentPayments.metadata,
      })
      .from(tournamentPayments)
      .where(eq(tournamentPayments.registrationId, registrationId))
      .limit(1);

    return jsonSuccess({
      registrationStatus: freshReg?.status ?? reg.status,
      paymentStatus: payment?.status ?? null,
      paid: payment?.status === "paid" || freshReg?.status === "confirmed",
      failed: payment?.status === "failed",
      expired: payment?.status === "expired",
      metadata: payment?.metadata ?? {},
    });
  } catch (error) {
    return jsonError(error);
  }
}
