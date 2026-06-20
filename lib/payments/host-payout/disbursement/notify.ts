import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hostPayoutDisbursements } from "@/db/schema/host-payout-disbursements";
import { user } from "@/db/schema/auth";
import { logger } from "@/lib/logger";
import { dashboardRoutes } from "@/lib/constants/routes";
import { siteConfig } from "@/lib/config";
import { createNotification } from "@/lib/notifications/service";
import { sendTemplatedEmailInBackground } from "@/lib/email/send";
import { formatIdrDisplay } from "@/lib/format/currency";
import { payoutScheduleLabel } from "@/lib/payments/host-payout/constants";
import { releaseDisbursementItems } from "@/lib/payments/host-payout/disbursement/queries";

const log = logger.child({ module: "host-payout-notify" });

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export async function notifyHostPayoutDisbursementSucceeded(
  disbursement: typeof hostPayoutDisbursements.$inferSelect,
): Promise<void> {
  const amount = formatIdrDisplay(disbursement.amountIdr);
  const schedule = payoutScheduleLabel(disbursement.payoutSchedule);
  const paymentsUrl = `${appBaseUrl()}${dashboardRoutes.hostPayments}`;

  await createNotification({
    userId: disbursement.hostUserId,
    type: "tournament_host_payout_disbursed",
    title: `Bank payout sent — ${amount}`,
    body: `${amount} from ${disbursement.paymentCount} registration(s) was transferred to ${disbursement.maskedAccount} on your ${schedule.toLowerCase()} schedule.`,
    actionUrl: paymentsUrl,
    metadata: {
      disbursementId: disbursement.id,
      amountIdr: disbursement.amountIdr,
      paymentCount: disbursement.paymentCount,
      maskedAccount: disbursement.maskedAccount,
    },
  });

  const [hostRow] = await getDb()
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, disbursement.hostUserId))
    .limit(1);

  if (!hostRow?.email) return;

  sendTemplatedEmailInBackground(
    {
      to: hostRow.email,
      template: "host-payout-disbursed",
      data: {
        appName: siteConfig.name,
        hostName: hostRow.name?.trim() || "Host",
        amountFormatted: amount,
        paymentCount: disbursement.paymentCount,
        scheduleLabel: schedule,
        maskedAccount: disbursement.maskedAccount,
        bankAccountHolder: disbursement.bankAccountHolder,
        completedAtFormatted: disbursement.completedAt
          ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(
              disbursement.completedAt,
            )
          : null,
        paymentsUrl,
      },
    },
    { module: "host-payout-disbursed" },
  );
}

export async function notifyHostPayoutDisbursementFailed(
  disbursement: typeof hostPayoutDisbursements.$inferSelect,
): Promise<void> {
  const amount = formatIdrDisplay(disbursement.amountIdr);
  const paymentsUrl = `${appBaseUrl()}${dashboardRoutes.hostPayments}`;
  const reason = disbursement.failureReason?.trim() || "The bank transfer could not be completed.";

  await createNotification({
    userId: disbursement.hostUserId,
    type: "tournament_host_payout_failed",
    title: "Bank payout failed",
    body: `We could not transfer ${amount} to ${disbursement.maskedAccount}. ${reason} Earnings remain in your balance and will be retried on the next cycle.`,
    actionUrl: paymentsUrl,
    metadata: {
      disbursementId: disbursement.id,
      failureCode: disbursement.failureCode,
      failureReason: disbursement.failureReason,
    },
  });

  const [hostRow] = await getDb()
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, disbursement.hostUserId))
    .limit(1);

  if (!hostRow?.email) return;

  sendTemplatedEmailInBackground(
    {
      to: hostRow.email,
      template: "host-payout-failed",
      data: {
        appName: siteConfig.name,
        hostName: hostRow.name?.trim() || "Host",
        amountFormatted: amount,
        maskedAccount: disbursement.maskedAccount,
        failureReason: reason,
        paymentsUrl,
      },
    },
    { module: "host-payout-failed" },
  );

  log.warn("Host payout disbursement failed notification sent", {
    disbursementId: disbursement.id,
    hostUserId: disbursement.hostUserId,
  });
}

export async function handleFailedDisbursementCleanup(disbursementId: string): Promise<void> {
  await releaseDisbursementItems(disbursementId);
}
