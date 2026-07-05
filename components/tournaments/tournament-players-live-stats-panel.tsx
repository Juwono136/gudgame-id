"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatStatDuration } from "@/lib/tournaments/stats/compute";
import { resolveBracketMatchDurationSeconds } from "@/lib/tournaments/stats/bracket-duration";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getReclubMatchHistoryKey, type ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";
import {
  cpBadgeLiveClass,
  cpFunAccentTextClass,
  cpLossTextClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type HistoryRow = {
  id: string;
  teamAName: string | null;
  teamBName: string | null;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreA: number | null;
  scoreB: number | null;
  roundLabel: string;
  durationSeconds: number | null;
  endedAt: string | null;
};

function formatPlayerLine(players: string[]): string | null {
  const names = players.map((p) => p.trim()).filter(Boolean);
  return names.length ? names.join(", ") : null;
}

type ManageScoringHistoryPanelProps = {
  sessionStats?: TournamentSessionStats;
  matches: ReclubMatchView[];
  bracketMatches?: BracketMatchView[];
  variant: "official" | "reclub";
  standingsMode?: "americano" | "elimination";
  isLoading?: boolean;
};

function formatHistoryRoundLabel(m: ReclubMatchView): string {
  if (m.roundLabel) return m.roundLabel;
  if (m.playType === "friendly") {
    return m.playNumber ? `Friendly #${m.playNumber}` : "Friendly";
  }
  if (m.playType === "bracket_rematch") {
    return m.playNumber ? `Bracket rematch #${m.playNumber}` : "Bracket rematch";
  }
  if (m.playType === "bracket" || m.sourceKind === "bracket") {
    return `Bracket · R${m.roundNumber}`;
  }
  return `Round ${m.roundNumber}`;
}

function buildHistoryRows(
  matches: ReclubMatchView[],
  bracketMatches: BracketMatchView[] = [],
): HistoryRow[] {
  const coveredBracketSlotIds = new Set<string>();
  for (const m of matches) {
    if (m.bracketMatchId) coveredBracketSlotIds.add(m.bracketMatchId);
    if (m.sourceKind === "bracket") coveredBracketSlotIds.add(m.id);
  }

  const reclubRows: HistoryRow[] = matches
    .filter((m) => m.status === "completed")
    .map((m) => ({
      id: getReclubMatchHistoryKey(m),
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      roundLabel: formatHistoryRoundLabel(m),
      durationSeconds: m.durationSeconds,
      endedAt: m.endedAt,
    }));

  const bracketRows: HistoryRow[] = bracketMatches
    .filter((m) => m.status === "completed" && !coveredBracketSlotIds.has(m.id))
    .map((m) => ({
      id: `bracket-slot-${m.id}`,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      teamAPlayers: m.teamAPlayers ?? [],
      teamBPlayers: m.teamBPlayers ?? [],
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      roundLabel: `R${m.roundNumber} · M${m.matchNumber}`,
      durationSeconds: resolveBracketMatchDurationSeconds(m),
      endedAt: m.completedAt,
    }));

  const seen = new Set<string>();
  return [...reclubRows, ...bracketRows]
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ManageScoringHistoryPanel({
  sessionStats,
  matches,
  bracketMatches = [],
  variant,
  standingsMode = "americano",
  isLoading,
}: ManageScoringHistoryPanelProps) {
  const accent = variant === "official" ? "text-cp-primary" : cpFunAccentTextClass;
  const completed = buildHistoryRows(matches, bracketMatches);
  const liveCount = sessionStats?.inProgressMatches ?? matches.filter((m) => m.status === "in_progress").length;
  const playersByTeam = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const player of sessionStats?.players ?? []) {
      const list = map.get(player.teamName) ?? [];
      list.push(player.displayName);
      map.set(player.teamName, list);
    }
    return map;
  }, [sessionStats?.players]);

  if (isLoading && !sessionStats) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner label="Loading session stats…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <BarChart3 className={cn("h-4 w-4", accent)} />
              Session snapshot
            </h3>
            <p className="mt-1 text-sm text-cp-muted">
              Updates when you finalize a match — same totals as the public tournament page.
            </p>
          </div>
          {liveCount > 0 ? (
            <Badge className={cpBadgeLiveClass}>
              {liveCount} live
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Finished", value: String(sessionStats?.completedMatches ?? completed.length) },
            { label: "Squads", value: String(sessionStats?.activeTeams ?? "—") },
            { label: "Players", value: String(sessionStats?.totalPlayers ?? "—") },
            {
              label: "Avg time",
              value: formatStatDuration(sessionStats?.avgDurationSeconds ?? null),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-cp-border/80 bg-cp-elevated/25 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                {item.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {sessionStats?.teams.length ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-cp-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cp-border bg-cp-elevated/50 text-[10px] uppercase tracking-wider text-cp-muted">
                  <th className="px-3 py-2 font-semibold">Team</th>
                  <th className="px-3 py-2 text-center font-semibold">W</th>
                  <th className="px-3 py-2 text-center font-semibold">L</th>
                  {standingsMode === "americano" ? (
                    <th className="px-3 py-2 text-center font-semibold">Pts</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {sessionStats.teams.slice(0, 8).map((team) => {
                  const roster = playersByTeam.get(team.name) ?? [];
                  return (
                  <tr key={team.name} className="border-b border-cp-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{team.name}</p>
                      {roster.length ? (
                        <p className="mt-0.5 text-[11px] leading-snug text-cp-muted">
                          {roster.join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className={cn("px-3 py-2 text-center font-semibold", accent)}>{team.wins}</td>
                    <td className={cn("px-3 py-2 text-center", cpLossTextClass)}>{team.losses}</td>
                    {standingsMode === "americano" ? (
                      <td className="px-3 py-2 text-center tabular-nums text-foreground">
                        {team.pointsFor}
                        <span className="text-cp-muted">–{team.pointsAgainst}</span>
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <History className={cn("h-4 w-4", accent)} />
          Match history & standings
        </h3>
        <p className="mt-1 text-sm text-cp-muted">
          Every finalized match is listed here — bracket plays, rematches, and friendly games.
        </p>
        {completed.length === 0 ? (
          <p className="mt-3 text-sm text-cp-muted">
            No matches finished yet. Start a match on any court — results appear here automatically.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-cp-border/60">
            {[...completed].slice(0, 24).map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-foreground">
                      {m.teamAName ?? "Team A"}{" "}
                      <span className="text-cp-muted">vs</span> {m.teamBName ?? "Team B"}
                    </p>
                    {formatPlayerLine(m.teamAPlayers) || formatPlayerLine(m.teamBPlayers) ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-cp-muted">
                        {[
                          formatPlayerLine(m.teamAPlayers)
                            ? `${m.teamAName ?? "Team A"}: ${formatPlayerLine(m.teamAPlayers)}`
                            : null,
                          formatPlayerLine(m.teamBPlayers)
                            ? `${m.teamBName ?? "Team B"}: ${formatPlayerLine(m.teamBPlayers)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-cp-muted">
                      {m.roundLabel}
                      {m.durationSeconds != null
                        ? ` · ${formatStatDuration(m.durationSeconds)}`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold tabular-nums text-foreground">
                    {m.scoreA ?? 0}
                    <span className="mx-1 text-cp-muted">:</span>
                    {m.scoreB ?? 0}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type TournamentPlayersLiveStatsPanelProps = {
  stats: TournamentSessionStats;
  variant: "official" | "reclub";
  emptyMessage?: string;
};

export function TournamentPlayersLiveStatsPanel({
  stats,
  variant,
  emptyMessage,
}: TournamentPlayersLiveStatsPanelProps) {
  const accent = variant === "official" ? "text-cp-primary" : cpFunAccentTextClass;
  const teamLabel = variant === "official" ? "Team" : "Squad";
  const hasActivity = stats.completedMatches > 0 || stats.inProgressMatches > 0;

  if (!hasActivity) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-6 py-14 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-cp-muted/60" />
        <p className="mt-3 text-sm font-medium text-foreground">No live stats yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-cp-muted">
          {emptyMessage ??
            "Player points and records appear here once matches are played and finalized."}
        </p>
      </div>
    );
  }

  const sortedPlayers = [...stats.players].sort((a, b) => {
    if (b.teamPointsFor !== a.teamPointsFor) return b.teamPointsFor - a.teamPointsFor;
    if (b.teamWins !== a.teamWins) return b.teamWins - a.teamWins;
    return a.displayName.localeCompare(b.displayName);
  });

  const showEmptyPlayersHint = sortedPlayers.length === 0 && stats.teams.length > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className={cn("h-5 w-5", accent)} />
          Live player stats
        </h2>
        <p className="mt-1 text-sm text-cp-muted">
          Points and match record from finished and in-progress matches in this tournament.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-cp-border bg-cp-card px-4 py-3">
          <p className="text-xs text-cp-muted">Matches played</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.completedMatches}</p>
        </div>
        <div className="rounded-xl border border-cp-border bg-cp-card px-4 py-3">
          <p className="text-xs text-cp-muted">{teamLabel}s active</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.activeTeams}</p>
        </div>
        <div className="rounded-xl border border-cp-border bg-cp-card px-4 py-3">
          <p className="text-xs text-cp-muted">Live now</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.inProgressMatches}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        {showEmptyPlayersHint ? (
          <div className="px-6 py-10 text-center text-sm text-cp-muted">
            Squad stats are ready — player rows appear once squads have members assigned in the lobby.
          </div>
        ) : (
          <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase tracking-wider text-cp-muted">
                <th className="px-4 py-3 font-semibold sm:px-6">Player</th>
                <th className="px-4 py-3 font-semibold">{teamLabel}</th>
                <th className="px-4 py-3 text-center font-semibold">Points</th>
                <th className="px-4 py-3 text-center font-semibold">W</th>
                <th className="px-4 py-3 text-center font-semibold">L</th>
                <th className="px-4 py-3 text-center font-semibold">Played</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr
                  key={player.userId}
                  className="border-b border-cp-border/60 transition-colors last:border-0 hover:bg-cp-elevated/25"
                >
                  <td className="px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-cp-border">
                        <AvatarImage src={player.image ?? undefined} alt="" />
                        <AvatarFallback className="bg-cp-elevated text-xs">
                          {initials(player.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      {player.profileUrl ? (
                        <Link
                          href={player.profileUrl}
                          className="font-medium text-foreground hover:text-cp-primary"
                        >
                          {player.displayName}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{player.displayName}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cp-muted">{player.teamName}</td>
                  <td className={cn("px-4 py-3 text-center text-base font-bold tabular-nums", accent)}>
                    {player.teamPointsFor}
                  </td>
                  <td className={cn("px-4 py-3 text-center font-semibold", accent)}>
                    {player.teamWins}
                  </td>
                  <td className={cn("px-4 py-3 text-center", cpLossTextClass)}>{player.teamLosses}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{player.teamPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-cp-border md:hidden">
          {sortedPlayers.map((player) => (
            <article key={player.userId} className="flex items-center gap-3 p-4">
              <Avatar className="h-10 w-10 border border-cp-border">
                <AvatarImage src={player.image ?? undefined} alt="" />
                <AvatarFallback className="bg-cp-elevated text-xs">
                  {initials(player.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{player.displayName}</p>
                <p className="text-xs text-cp-muted">{player.teamName}</p>
              </div>
              <div className="text-right">
                <p className={cn("text-lg font-bold tabular-nums", accent)}>
                  {player.teamPointsFor} pts
                </p>
                <p className="text-xs text-cp-muted">
                  {player.teamWins}W · {player.teamLosses}L · {player.teamPlayed} played
                </p>
              </div>
            </article>
          ))}
        </div>
          </>
        )}
      </div>
    </section>
  );
}
