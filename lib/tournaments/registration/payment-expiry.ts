import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { logger } from "@/lib/logger";
import { notifyPaymentExpired, notifyPaymentFailed } from "@/lib/tournaments/registration/notify-flow";

const log = logger.child({ module: "payment-expiry" });

export type PaymentWindowState = "active" | "expired" | "not_applicable";

export async function expireRegistrationIfOverdue(
  registrationId: number,
): Promise<PaymentWindowState> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, registrationId))
    .limit(1);

  if (!registration) return "not_applicable";
  if (registration.status !== "pending_payment") return "not_applicable";
  if (!registration.paymentDueAt) return "active";

  if (registration.paymentDueAt.getTime() > Date.now()) return "active";

  await db
    .update(tournamentRegistrations)
    .set({ status: "cancelled" })
    .where(eq(tournamentRegistrations.id, registrationId));

  await db
    .update(tournamentPayments)
    .set({ status: "expired" })
    .where(eq(tournamentPayments.registrationId, registrationId));

  if (registration.teamId) {
    await db
      .delete(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, registration.teamId));
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, registration.teamId));
  }

  void notifyPaymentExpired(registrationId);
  log.info("Registration expired — payment window closed", { registrationId });
  return "expired";
}

export async function markPaymentAttemptFailed(
  registrationId: number,
  reason: "failed" | "expired",
): Promise<void> {
  const db = getDb();
  const windowState = await expireRegistrationIfOverdue(registrationId);
  if (windowState === "expired") return;

  const [registration] = await db
    .select({ status: tournamentRegistrations.status })
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, registrationId))
    .limit(1);

  if (!registration || registration.status !== "pending_payment") return;

  await db
    .update(tournamentPayments)
    .set({ status: reason })
    .where(eq(tournamentPayments.registrationId, registrationId));

  if (reason === "failed") {
    void notifyPaymentFailed(registrationId);
  }
}
