import type { PayoutSchedule } from "@/lib/payments/host-payout/constants";

const DAY_MS = 86_400_000;

export function getScheduleIntervalDays(schedule: PayoutSchedule): number {
  switch (schedule) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    default:
      return 7;
  }
}

export function isPayoutDue(
  schedule: PayoutSchedule,
  lastCompletedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!lastCompletedAt) return true;

  if (schedule === "monthly") {
    const lastMonth = lastCompletedAt.getUTCFullYear() * 12 + lastCompletedAt.getUTCMonth();
    const nowMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
    return nowMonth > lastMonth;
  }

  const intervalDays = getScheduleIntervalDays(schedule);
  const elapsedDays = Math.floor((now.getTime() - lastCompletedAt.getTime()) / DAY_MS);
  return elapsedDays >= intervalDays;
}

export function computeNextPayoutAt(
  schedule: PayoutSchedule,
  lastCompletedAt: Date | null,
  now: Date = new Date(),
): Date | null {
  if (!lastCompletedAt) {
    return now;
  }

  if (schedule === "monthly") {
    const next = new Date(
      Date.UTC(lastCompletedAt.getUTCFullYear(), lastCompletedAt.getUTCMonth() + 1, 1, 8, 0, 0),
    );
    return next > now ? next : now;
  }

  const intervalDays = getScheduleIntervalDays(schedule);
  const next = new Date(lastCompletedAt.getTime() + intervalDays * DAY_MS);
  return next > now ? next : now;
}

export function formatScheduleLabel(schedule: PayoutSchedule): string {
  switch (schedule) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Monthly";
    default:
      return "Weekly";
  }
}
