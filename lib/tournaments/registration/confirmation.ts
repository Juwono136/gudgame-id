import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { tournamentRegistrations } from "@/db/schema/tournament-registration";
import { AppError } from "@/lib/errors";
import { isXenditConfigured } from "@/lib/payments/xendit";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  checkoutUrl,
  getPaymentDueDate,
  notifyHostPlayerConfirmedParticipation,
  notifyPaymentReminder,
  notifyRegistrationCancelled,
} from "@/lib/tournaments/registration/notify-flow";
import {
  issueRegistrationInvoice,
  rollbackDraftRegistration,
} from "@/lib/tournaments/registration/service";

export async function confirmParticipation(
  tournament: TournamentDetail,
  registrationId: string,
  userId: string,
  payerEmail: string,
): Promise<{ registrationId: string; checkoutUrl?: string; amountIdr?: number; status: string }> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.id, registrationId),
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.registeredByUserId, userId),
      ),
    )
    .limit(1);

  if (!registration) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status === "confirmed") {
    throw new AppError("You are already registered for this tournament.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (registration.status === "declined" || registration.status === "cancelled") {
    throw new AppError("This registration is no longer active.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (registration.status === "pending_payment") {
    const url = checkoutUrl(tournament, registrationId);
    const fee = tournament.registrationFeeIdr ?? 0;
    return { registrationId, checkoutUrl: url, amountIdr: fee, status: "pending_payment" };
  }

  if (registration.status !== "awaiting_confirmation") {
    throw new AppError("Registration cannot be confirmed in its current state.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  let teamName = "Team";
  if (registration.teamId) {
    const { tournamentTeams } = await import("@/db/schema/tournament-registration");
    const [team] = await db
      .select({ name: tournamentTeams.name })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.id, registration.teamId))
      .limit(1);
    if (team?.name) teamName = team.name;
  }

  const isFreeOfficial = tournament.officialBilling === "free";

  if (isFreeOfficial) {
    await db
      .update(tournamentRegistrations)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedByUserId: userId,
      })
      .where(eq(tournamentRegistrations.id, registrationId));

    void notifyHostPlayerConfirmedParticipation(tournament, registrationId, userId, teamName);

    return { registrationId, status: "confirmed" };
  }

  if (!isXenditConfigured()) {
    throw new AppError("Payment gateway is not configured yet.", {
      code: "PAYMENT_NOT_CONFIGURED",
      statusCode: 503,
    });
  }

  const fee = tournament.registrationFeeIdr;
  if (!fee || fee <= 0) {
    throw new AppError("Registration fee is not configured.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  const paymentDueAt = getPaymentDueDate();

  await db
    .update(tournamentRegistrations)
    .set({
      status: "pending_payment",
      confirmedAt: new Date(),
      confirmedByUserId: userId,
      paymentDueAt,
    })
    .where(eq(tournamentRegistrations.id, registrationId));

  try {
    const { amountIdr } = await issueRegistrationInvoice(
      tournament,
      registrationId,
      userId,
      payerEmail,
      fee,
    );

    void notifyPaymentReminder(tournament, registrationId, userId, teamName, amountIdr);
    void notifyHostPlayerConfirmedParticipation(tournament, registrationId, userId, teamName);

    return {
      registrationId,
      checkoutUrl: checkoutUrl(tournament, registrationId),
      amountIdr,
      status: "pending_payment",
    };
  } catch (error) {
    await db
      .update(tournamentRegistrations)
      .set({
        status: "awaiting_confirmation",
        confirmedAt: null,
        confirmedByUserId: null,
        paymentDueAt: null,
      })
      .where(eq(tournamentRegistrations.id, registrationId));
    throw error;
  }
}

export async function declineParticipation(
  tournament: TournamentDetail,
  registrationId: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  const [registration] = await db
    .select()
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.id, registrationId),
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.registeredByUserId, userId),
      ),
    )
    .limit(1);

  if (!registration) {
    throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  if (registration.status === "confirmed") {
    throw new AppError("Cannot decline a confirmed registration.", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  if (registration.status !== "awaiting_confirmation" && registration.status !== "pending_payment") {
    throw new AppError("Registration cannot be declined in its current state.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  let teamName = "Team";
  if (registration.teamId) {
    const { tournamentTeams } = await import("@/db/schema/tournament-registration");
    const [team] = await db
      .select({ name: tournamentTeams.name })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.id, registration.teamId))
      .limit(1);
    if (team?.name) teamName = team.name;
  }

  const reason =
    registration.status === "pending_payment"
      ? "You cancelled before completing payment."
      : "You declined to participate in this tournament.";

  void notifyRegistrationCancelled(
    tournament,
    registrationId,
    userId,
    teamName,
    reason,
    true,
  );

  if (registration.teamId) {
    await rollbackDraftRegistration(registration.teamId, registrationId);
  } else {
    await db
      .update(tournamentRegistrations)
      .set({ status: "declined", declinedAt: new Date() })
      .where(eq(tournamentRegistrations.id, registrationId));
  }
}

export async function loadPayerEmail(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row?.email) {
    throw new AppError("Account email is required", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
  return row.email;
}
