import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentBracketMatches } from "@/db/schema/tournament-matches";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";

export type LeaderboardEntry = {
  rank: number;
  teamId: number;
  teamName: string;
  points: number;
  wins: number;
  losses: number;
  winRate: number;
  form: ("W" | "L")[];
};

async function listLeaderboardTeams(tournamentId: number) {
  const db = getDb();
  const registered = await db
    .select({ id: tournamentTeams.id, name: tournamentTeams.name })
    .from(tournamentRegistrations)
    .innerJoin(tournamentTeams, eq(tournamentRegistrations.teamId, tournamentTeams.id))
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, "confirmed"),
      ),
    );

  if (registered.length) return registered;

  const bracketTeams = await db
    .select({
      id: tournamentTeams.id,
      name: tournamentTeams.name,
    })
    .from(tournamentBracketMatches)
    .innerJoin(tournamentTeams, eq(tournamentBracketMatches.teamAId, tournamentTeams.id))
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId));

  const bracketTeamsB = await db
    .select({
      id: tournamentTeams.id,
      name: tournamentTeams.name,
    })
    .from(tournamentBracketMatches)
    .innerJoin(tournamentTeams, eq(tournamentBracketMatches.teamBId, tournamentTeams.id))
    .where(eq(tournamentBracketMatches.tournamentId, tournamentId));

  const merged = new Map<number, string>();
  for (const t of [...bracketTeams, ...bracketTeamsB]) {
    merged.set(t.id, t.name);
  }
  return [...merged.entries()].map(([id, name]) => ({ id, name }));
}

export async function buildTournamentLeaderboard(
  tournamentId: number,
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  const teams = await listLeaderboardTeams(tournamentId);

  const matches = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, tournamentId),
        eq(tournamentBracketMatches.status, "completed"),
      ),
    );

  const stats = new Map<
    number,
    { wins: number; losses: number; form: ("W" | "L")[]; name: string }
  >();

  for (const team of teams) {
    stats.set(team.id, { wins: 0, losses: 0, form: [], name: team.name });
  }

  const sortedMatches = [...matches].sort((a, b) => {
    const at = a.completedAt?.getTime() ?? 0;
    const bt = b.completedAt?.getTime() ?? 0;
    return at - bt;
  });

  for (const m of sortedMatches) {
    if (!m.winnerTeamId || !m.teamAId || !m.teamBId) continue;
    const loserId = m.winnerTeamId === m.teamAId ? m.teamBId : m.teamAId;
    const winner = stats.get(m.winnerTeamId);
    const loser = stats.get(loserId);
    if (winner) {
      winner.wins += 1;
      winner.form.push("W");
    }
    if (loser) {
      loser.losses += 1;
      loser.form.push("L");
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const [teamId, s] of stats) {
    const total = s.wins + s.losses;
    entries.push({
      rank: 0,
      teamId,
      teamName: s.name,
      points: s.wins * 100,
      wins: s.wins,
      losses: s.losses,
      winRate: total > 0 ? Math.round((s.wins / total) * 1000) / 10 : 0,
      form: s.form.slice(-5),
    });
  }

  entries.sort((a, b) => b.points - a.points || b.winRate - a.winRate);
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function getTeamMemberUserIds(teamId: number): Promise<string[]> {
  const rows = await getDb()
    .select({ userId: tournamentTeamMembers.userId })
    .from(tournamentTeamMembers)
    .where(eq(tournamentTeamMembers.teamId, teamId));
  return rows.map((r) => r.userId);
}
