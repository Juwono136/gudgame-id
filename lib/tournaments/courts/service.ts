import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentCourts } from "@/db/schema/tournament-courts";
import { tournamentGroupMatches } from "@/db/schema/tournament-groups";
import { tournamentReclubMatches, tournamentBracketMatches } from "@/db/schema/tournament-matches";
import { AppError } from "@/lib/errors";
import { getTournamentCourtCount } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";

export type TournamentCourtView = {
  id: string;
  courtNumber: number;
  name: string;
  sortOrder: number;
  activeMatchId: string | null;
};

export async function listTournamentCourts(tournamentId: string): Promise<TournamentCourtView[]> {
  const db = getDb();
  const courts = await db
    .select()
    .from(tournamentCourts)
    .where(eq(tournamentCourts.tournamentId, tournamentId))
    .orderBy(asc(tournamentCourts.sortOrder), asc(tournamentCourts.courtNumber));

  const [reclubActive, bracketActive, groupActive] = await Promise.all([
    db
      .select({ id: tournamentReclubMatches.id, courtId: tournamentReclubMatches.courtId })
      .from(tournamentReclubMatches)
      .where(
        and(
          eq(tournamentReclubMatches.tournamentId, tournamentId),
          eq(tournamentReclubMatches.status, "in_progress"),
        ),
      ),
    db
      .select({ id: tournamentBracketMatches.id, courtId: tournamentBracketMatches.courtId })
      .from(tournamentBracketMatches)
      .where(
        and(
          eq(tournamentBracketMatches.tournamentId, tournamentId),
          eq(tournamentBracketMatches.status, "in_progress"),
        ),
      ),
    db
      .select({ id: tournamentGroupMatches.id, courtId: tournamentGroupMatches.courtId })
      .from(tournamentGroupMatches)
      .where(
        and(
          eq(tournamentGroupMatches.tournamentId, tournamentId),
          eq(tournamentGroupMatches.status, "in_progress"),
        ),
      ),
  ]);

  const activeByCourt = new Map<string, string>();
  for (const m of [...reclubActive, ...bracketActive, ...groupActive]) {
    if (m.courtId) activeByCourt.set(m.courtId, m.id);
  }

  return courts.map((c) => ({
    id: c.id,
    courtNumber: c.courtNumber,
    name: c.name,
    sortOrder: c.sortOrder,
    activeMatchId: activeByCourt.get(c.id) ?? null,
  }));
}

export async function provisionTournamentCourts(
  tournament: TournamentDetail,
): Promise<TournamentCourtView[]> {
  const db = getDb();
  const count = getTournamentCourtCount(tournament);
  const existing = await db
    .select()
    .from(tournamentCourts)
    .where(eq(tournamentCourts.tournamentId, tournament.id))
    .orderBy(asc(tournamentCourts.courtNumber));

  if (existing.length === count) {
    return listTournamentCourts(tournament.id);
  }

  if (existing.length > count) {
    const toRemove = existing.filter((c) => c.courtNumber > count);
    for (const court of toRemove) {
      const active = await db
        .select({ id: tournamentReclubMatches.id })
        .from(tournamentReclubMatches)
        .where(
          and(
            eq(tournamentReclubMatches.courtId, court.id),
            eq(tournamentReclubMatches.status, "in_progress"),
          ),
        )
        .limit(1);
      if (active.length) {
        throw new AppError(`Cannot remove ${court.name} while a match is in progress`, {
          code: "CONFLICT",
          statusCode: 409,
        });
      }
      await db.delete(tournamentCourts).where(eq(tournamentCourts.id, court.id));
    }
  }

  const existingNumbers = new Set(existing.map((c) => c.courtNumber));
  for (let n = 1; n <= count; n++) {
    if (existingNumbers.has(n)) continue;
    await db.insert(tournamentCourts).values({
      tournamentId: tournament.id,
      courtNumber: n,
      name: `Court ${n}`,
      sortOrder: n,
    });
  }

  const kept = existing.filter((c) => c.courtNumber <= count);
  for (const court of kept) {
    if (court.name === `Court ${court.courtNumber}` || /^Court \d+$/.test(court.name)) {
      continue;
    }
  }

  return listTournamentCourts(tournament.id);
}

export async function renameTournamentCourt(
  tournamentId: string,
  courtId: string,
  name: string,
): Promise<TournamentCourtView> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new AppError("Court name must be 1–80 characters", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();
  const [updated] = await db
    .update(tournamentCourts)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(and(eq(tournamentCourts.id, courtId), eq(tournamentCourts.tournamentId, tournamentId)))
    .returning();

  if (!updated) {
    throw new AppError("Court not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const courts = await listTournamentCourts(tournamentId);
  const row = courts.find((c) => c.id === courtId);
  if (!row) throw new AppError("Court not found", { code: "NOT_FOUND", statusCode: 404 });
  return row;
}

export async function getCourtById(tournamentId: string, courtId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(tournamentCourts)
    .where(and(eq(tournamentCourts.id, courtId), eq(tournamentCourts.tournamentId, tournamentId)))
    .limit(1);
  return row ?? null;
}

export async function assertCourtAvailable(
  tournamentId: string,
  courtId: string,
): Promise<void> {
  const court = await getCourtById(tournamentId, courtId);
  if (!court) {
    throw new AppError("Court not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const courts = await listTournamentCourts(tournamentId);
  const view = courts.find((c) => c.id === courtId);
  if (view?.activeMatchId) {
    throw new AppError("This court already has a match in progress", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }
}
