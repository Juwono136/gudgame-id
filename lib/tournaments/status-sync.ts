import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournaments, type TournamentStatus } from "@/db/schema/tournaments";
import { invalidateTournamentCaches } from "@/lib/tournaments/cache";
import { finalizeStaleActiveMatches } from "@/lib/tournaments/lifecycle/finalize-active-matches";

type DateInput = Date | string | null | undefined;

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Derive lifecycle status from schedule (draft/cancelled stay manual). */
export function computeTournamentStatus(
  current: TournamentStatus,
  startsAt: DateInput,
  endsAt: DateInput,
  now: Date = new Date(),
): TournamentStatus {
  if (current === "draft" || current === "cancelled") return current;

  const start = toDate(startsAt);
  const end = toDate(endsAt);

  if (end && now > end) return "completed";
  if (start && now >= start) return "live";
  return "upcoming";
}

export function computeRegistrationOpen(
  registrationOpensAt: DateInput,
  registrationClosesAt: DateInput,
  tournamentStartsAt: DateInput,
  now: Date = new Date(),
): boolean {
  const opens = toDate(registrationOpensAt);
  const closes = toDate(registrationClosesAt) ?? toDate(tournamentStartsAt);
  const ts = now.getTime();

  if (opens && ts < opens.getTime()) return false;
  if (closes && ts >= closes.getTime()) return false;
  return true;
}

type TournamentRow = {
  id: string;
  sportSlug: string;
  slug: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Persist status when schedule implies a change (non-draft/cancelled). */
export async function syncTournamentStatusFromSchedule(
  row: TournamentRow,
): Promise<TournamentStatus> {
  const computed = computeTournamentStatus(
    row.status as TournamentStatus,
    row.startsAt,
    row.endsAt,
  );

  if (computed === row.status) return computed;

  if (row.status === "draft" || row.status === "cancelled") {
    return row.status as TournamentStatus;
  }

  await getDb()
    .update(tournaments)
    .set({ status: computed, updatedAt: new Date() })
    .where(eq(tournaments.id, row.id));

  if (computed === "completed" || computed === "cancelled") {
    await finalizeStaleActiveMatches(
      row.id,
      computed === "cancelled" ? "cancelled" : "completed",
    );
  }

  await invalidateTournamentCaches(row.sportSlug, row.slug);
  return computed;
}

/** Status stored on create/update — only draft/cancelled are manual. */
export function resolveStatusOnWrite(
  requested: TournamentStatus,
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date = new Date(),
): TournamentStatus {
  if (requested === "draft" || requested === "cancelled") return requested;
  return computeTournamentStatus("upcoming", startsAt, endsAt, now);
}
