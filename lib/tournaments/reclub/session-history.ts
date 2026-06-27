import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import { tournamentTeamMembers } from "@/db/schema/tournament-registration";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import { mapReclubMatchRow } from "@/lib/tournaments/reclub/match-mapper";
import type { ReclubMatchView, ReclubMatchesListQuery } from "@/lib/tournaments/reclub/types";
import { parseReclubMatchMetadata } from "@/lib/tournaments/reclub/score-events";
import { isFunMatchType } from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";

type BracketRow = typeof tournamentBracketMatches.$inferSelect;

async function getTeamPlayerNames(teamId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ name: user.name })
    .from(tournamentTeamMembers)
    .innerJoin(user, eq(tournamentTeamMembers.userId, user.id))
    .where(eq(tournamentTeamMembers.teamId, teamId))
    .orderBy(tournamentTeamMembers.slotIndex);

  return rows.map((r) => r.name).filter(Boolean);
}

function bracketRowToHistoryView(
  row: BracketRow,
  roundLabel: string,
  teamAPlayers: string[],
  teamBPlayers: string[],
): ReclubMatchView {
  const completedAt = row.completedAt?.toISOString() ?? null;
  return {
    id: row.id,
    roundNumber: row.roundNumber,
    teamAId: row.teamAId,
    teamBId: row.teamBId,
    teamAName: row.teamAName,
    teamBName: row.teamBName,
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    durationSeconds: null,
    summary: `Bracket · ${roundLabel}`,
    status: row.status === "in_progress" ? "in_progress" : "completed",
    startedAt: completedAt,
    endedAt: completedAt,
    teamAPlayers,
    teamBPlayers,
    scoreEvents: [],
    sourceKind: "bracket",
    bracketMatchId: row.id,
    roundLabel,
  };
}

async function listBracketHistoryViews(tournamentId: string): Promise<ReclubMatchView[]> {
  const rows = await getDb()
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        inArray(tournamentBracketMatches.status, ["completed", "in_progress"]),
      ),
    )
    .orderBy(desc(tournamentBracketMatches.roundNumber));

  if (!rows.length) return [];

  const maxRound = Math.max(...rows.map((r) => r.roundNumber));
  const views: ReclubMatchView[] = [];

  for (const row of rows) {
    if (!row.teamAName && !row.teamBName) continue;
    const roundLabel = getBracketRoundLabel(row.roundNumber, maxRound);
    const [teamAPlayers, teamBPlayers] = await Promise.all([
      row.teamAId ? getTeamPlayerNames(row.teamAId) : Promise.resolve([]),
      row.teamBId ? getTeamPlayerNames(row.teamBId) : Promise.resolve([]),
    ]);
    views.push(bracketRowToHistoryView(row, roundLabel, teamAPlayers, teamBPlayers));
  }

  return views;
}

function getRecordedBracketIds(reclubRows: { metadata: unknown }[]): Set<string> {
  const ids = new Set<string>();
  for (const row of reclubRows) {
    const meta = row.metadata as Record<string, unknown> | null;
    const id = meta?.bracketMatchId;
    if (typeof id === "string") ids.add(id);
  }
  return ids;
}

function sortHistoryItems(items: ReclubMatchView[]): ReclubMatchView[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.endedAt ?? a.startedAt ?? 0).getTime();
    const bTime = new Date(b.endedAt ?? b.startedAt ?? 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return b.roundNumber - a.roundNumber;
  });
}

function filterHistoryItems(
  items: ReclubMatchView[],
  query: ReclubMatchesListQuery,
): ReclubMatchView[] {
  let filtered = items;

  if (query.status && query.status !== "all") {
    filtered = filtered.filter((m) => m.status === query.status);
  }

  if (query.search?.trim()) {
    const term = query.search.trim().toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.teamAName?.toLowerCase().includes(term) ||
        m.teamBName?.toLowerCase().includes(term) ||
        m.summary?.toLowerCase().includes(term) ||
        m.roundLabel?.toLowerCase().includes(term),
    );
  }

  return filtered;
}

export async function mergeReclubSessionHistory(
  tournamentId: string,
  reclubItems: ReclubMatchView[],
): Promise<ReclubMatchView[]> {
  const reclubRows = await getDb()
    .select({ metadata: tournamentReclubMatches.metadata })
    .from(tournamentReclubMatches)
    .where(eq(tournamentReclubMatches.tournamentId, tournamentId));

  const recordedBracketIds = getRecordedBracketIds(reclubRows);
  const bracketViews = await listBracketHistoryViews(tournamentId);
  const unrecordedBracket = bracketViews.filter(
    (m) => m.bracketMatchId != null && !recordedBracketIds.has(m.bracketMatchId),
  );

  return sortHistoryItems([...reclubItems, ...unrecordedBracket]);
}

export async function listMergedReclubSessionHistory(
  tournamentId: string,
  query: ReclubMatchesListQuery,
): Promise<{
  items: ReclubMatchView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const db = getDb();
  const reclubRows = await db
    .select()
    .from(tournamentReclubMatches)
    .where(eq(tournamentReclubMatches.tournamentId, tournamentId))
    .orderBy(desc(tournamentReclubMatches.roundNumber));

  const reclubItems = reclubRows.map((row) => {
    const view = mapReclubMatchRow(row);
    const meta = parseReclubMatchMetadata(row.metadata);
    const raw = row.metadata as Record<string, unknown> | null;
    return {
      ...view,
      teamAPlayers: meta.teamAPlayers ?? view.teamAPlayers,
      teamBPlayers: meta.teamBPlayers ?? view.teamBPlayers,
      sourceKind:
        typeof raw?.bracketMatchId === "string"
          ? ("bracket" as const)
          : ("round" as const),
      bracketMatchId:
        typeof raw?.bracketMatchId === "string" ? raw.bracketMatchId : null,
      roundLabel: typeof raw?.roundLabel === "string" ? raw.roundLabel : null,
    };
  });

  const merged = await mergeReclubSessionHistory(tournamentId, reclubItems);
  const filtered = filterHistoryItems(merged, query);
  const total = filtered.length;
  const offset = (query.page - 1) * query.pageSize;

  return {
    items: filtered.slice(offset, offset + query.pageSize),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
  };
}

export async function recordBracketMatchInSessionHistory(
  tournament: TournamentDetail,
  bracketMatch: BracketRow,
  userId: string,
): Promise<void> {
  if (!isFunMatchType(tournament.tournamentType)) return;

  const db = getDb();
  const [existing] = await db
    .select({ id: tournamentReclubMatches.id })
    .from(tournamentReclubMatches)
    .where(
      and(
        eq(tournamentReclubMatches.tournamentId, tournament.id),
        sql`${tournamentReclubMatches.metadata}->>'bracketMatchId' = ${String(bracketMatch.id)}`,
      ),
    )
    .limit(1);

  if (existing) return;

  const allRounds = await db
    .select({ roundNumber: tournamentBracketMatches.roundNumber })
    .from(tournamentBracketMatches)
    .where(eq(tournamentBracketMatches.tournamentId, tournament.id));
  const maxRound = Math.max(...allRounds.map((r) => r.roundNumber), 1);
  const roundLabel = getBracketRoundLabel(bracketMatch.roundNumber, maxRound);

  const [teamAPlayers, teamBPlayers] = await Promise.all([
    bracketMatch.teamAId ? getTeamPlayerNames(bracketMatch.teamAId) : Promise.resolve([]),
    bracketMatch.teamBId ? getTeamPlayerNames(bracketMatch.teamBId) : Promise.resolve([]),
  ]);

  const endedAt = bracketMatch.completedAt ?? new Date();

  await db.insert(tournamentReclubMatches).values({
    tournamentId: tournament.id,
    roundNumber: bracketMatch.roundNumber,
    teamAId: bracketMatch.teamAId,
    teamBId: bracketMatch.teamBId,
    teamAName: bracketMatch.teamAName,
    teamBName: bracketMatch.teamBName,
    scoreA: bracketMatch.scoreA,
    scoreB: bracketMatch.scoreB,
    status: "completed",
    startedAt: endedAt,
    endedAt,
    summary: `Bracket · ${roundLabel} · M${bracketMatch.matchNumber}`,
    recordedByUserId: userId,
    metadata: {
      bracketMatchId: bracketMatch.id,
      bracketMatchNumber: bracketMatch.matchNumber,
      source: "bracket",
      roundLabel,
      teamAPlayers,
      teamBPlayers,
      scoreEvents: [],
    },
  });
}
