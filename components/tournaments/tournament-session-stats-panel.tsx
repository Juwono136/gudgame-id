"use client";

import Link from "next/link";
import { BarChart3, Clock, Swords, Trophy, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TournamentDetailSection,
  TournamentStatCard,
} from "@/components/tournaments/tournament-detail-ui";
import { formatStatDuration } from "@/lib/tournaments/stats/compute";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type TournamentSessionStatsPanelProps = {
  variant: "reclub" | "official";
  stats: TournamentSessionStats;
  emptyMessage?: string;
};

const COPY = {
  reclub: {
    title: "Session stats",
    subtitle: "Who's winning this session — updated automatically after each finished match.",
    teamLabel: "Squad",
    standingsTitle: "Squad standings",
    playersTitle: "Players",
    teamNoun: "squad",
    teamsKpi: "Squads",
    leaderBadge: (name: string) => `Leader: ${name}`,
    standingsHint:
      "Ranked by wins, then win rate. Scored = points your squad made; Conceded = points opponents scored against you.",
    playersHint: "Each player inherits their squad's match record for this session.",
    emptyDefault:
      "Play lobby rounds or run the bracket — standings and player activity will appear here automatically.",
    mostWinsHint: "Squad with the most finished-match victories",
  },
  official: {
    title: "Tournament stats",
    subtitle: "Team and player performance from bracket matches in this tournament only.",
    teamLabel: "Team",
    standingsTitle: "Team standings",
    playersTitle: "Players",
    teamNoun: "team",
    teamsKpi: "Teams",
    leaderBadge: (name: string) => `Leader: ${name}`,
    standingsHint:
      "Ranked by wins, then win rate. Scored = points your team made; Conceded = points opponents scored against you.",
    playersHint: "Each player inherits their team's match record in this tournament.",
    emptyDefault:
      "Stats appear once bracket matches are played. Only results from this tournament are counted.",
    mostWinsHint: "Team with the most finished-match victories",
  },
} as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function WinRateBar({
  value,
  variant,
}: {
  value: number;
  variant: "reclub" | "official";
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cp-elevated">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variant === "reclub" ? "bg-emerald-500" : "bg-cp-primary",
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-cp-muted">{value}%</span>
    </div>
  );
}

function EmptyStats({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-6 py-14 text-center">
      <BarChart3 className="mx-auto h-10 w-10 text-cp-muted/60" />
      <p className="mt-3 text-sm font-medium text-foreground">No stats yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-cp-muted">{message}</p>
    </div>
  );
}

function TeamStandingsTable({
  teams,
  variant,
  teamLabel,
  hint,
}: {
  teams: TournamentSessionStats["teams"];
  variant: "reclub" | "official";
  teamLabel: string;
  hint: string;
}) {
  const winColor = variant === "reclub" ? "text-emerald-400" : "text-cp-primary";
  const badgeClass =
    variant === "reclub"
      ? cn("border-0", statusBadgeClass.reclub)
      : cn("border-0", statusBadgeClass.accent);

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-cp-muted">{hint}</p>
      <div className="overflow-hidden rounded-xl border border-cp-border">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-cp-border bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                <th className="px-4 py-3 sm:px-5">#</th>
                <th className="px-4 py-3">{teamLabel}</th>
                <th className="px-4 py-3 text-center">Wins</th>
                <th className="px-4 py-3 text-center">Losses</th>
                <th className="px-4 py-3 text-center">Matches</th>
                <th className="px-4 py-3 text-center">Scored</th>
                <th className="px-4 py-3 text-center">Conceded</th>
                <th className="px-4 py-3">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cp-border/70">
              {teams.map((team, i) => (
                <tr key={team.teamId ?? team.name} className="transition-colors hover:bg-cp-elevated/25">
                  <td className="px-4 py-3.5 text-cp-muted sm:px-5">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground">{team.name}</p>
                    <p className="text-xs text-cp-muted">
                      {team.memberCount} player{team.memberCount === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className={cn("px-4 py-3.5 text-center font-semibold", winColor)}>
                    {team.wins}
                  </td>
                  <td className="px-4 py-3.5 text-center text-red-300/90">{team.losses}</td>
                  <td className="px-4 py-3.5 text-center tabular-nums text-foreground">
                    {team.played}
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums text-foreground">
                    {team.pointsFor}
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums text-cp-muted">
                    {team.pointsAgainst}
                  </td>
                  <td className="px-4 py-3.5">
                    <WinRateBar value={team.winRate} variant={variant} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-cp-border md:hidden">
          {teams.map((team, i) => (
            <article key={team.teamId ?? team.name} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    <span className="mr-2 text-cp-muted">#{i + 1}</span>
                    {team.name}
                  </p>
                  <p className="text-xs text-cp-muted">
                    {team.memberCount} player{team.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge className={badgeClass}>
                  {team.wins} win{team.wins === 1 ? "" : "s"} · {team.losses} loss
                  {team.losses === 1 ? "" : "es"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-cp-muted">
                <span>
                  {team.played} match{team.played === 1 ? "" : "es"}
                </span>
                <span>
                  Scored <strong className="text-foreground">{team.pointsFor}</strong>
                </span>
                <span>
                  Conceded <strong className="text-foreground">{team.pointsAgainst}</strong>
                </span>
              </div>
              <WinRateBar value={team.winRate} variant={variant} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerActivityTable({
  players,
  variant,
  teamLabel,
  hint,
}: {
  players: TournamentSessionStats["players"];
  variant: "reclub" | "official";
  teamLabel: string;
  hint: string;
}) {
  const winColor = variant === "reclub" ? "text-emerald-400" : "text-cp-primary";

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-cp-muted">{hint}</p>
      <div className="overflow-hidden rounded-xl border border-cp-border">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cp-border bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                <th className="px-4 py-3 sm:px-5">Player</th>
                <th className="px-4 py-3">{teamLabel}</th>
                <th className="px-4 py-3 text-center">Wins</th>
                <th className="px-4 py-3 text-center">Losses</th>
                <th className="px-4 py-3 text-center">Points</th>
                <th className="px-4 py-3 text-center">Matches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cp-border/70">
              {players.map((player) => (
                <tr key={player.userId} className="transition-colors hover:bg-cp-elevated/25">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-cp-border">
                        <AvatarImage src={player.image ?? undefined} alt="" />
                        <AvatarFallback className="bg-cp-elevated text-[10px]">
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
                  <td className={cn("px-4 py-3 text-center font-semibold", winColor)}>
                    {player.teamWins}
                  </td>
                  <td className="px-4 py-3 text-center text-red-300/90">{player.teamLosses}</td>
                  <td className={cn("px-4 py-3 text-center font-semibold tabular-nums", winColor)}>
                    {player.teamPointsFor}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground">
                    {player.teamPlayed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-cp-border sm:hidden">
          {players.map((player) => (
            <article key={player.userId} className="flex items-center gap-3 p-4">
              <Avatar className="h-9 w-9 border border-cp-border">
                <AvatarImage src={player.image ?? undefined} alt="" />
                <AvatarFallback className="bg-cp-elevated text-xs">
                  {initials(player.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {player.profileUrl ? (
                  <Link
                    href={player.profileUrl}
                    className="block truncate font-medium text-foreground hover:text-cp-primary"
                  >
                    {player.displayName}
                  </Link>
                ) : (
                  <p className="truncate font-medium text-foreground">{player.displayName}</p>
                )}
                <p className="text-xs text-cp-muted">{player.teamName}</p>
              </div>
              <div className="text-right text-xs">
                <p className={cn("font-semibold", winColor)}>
                  {player.teamWins} win{player.teamWins === 1 ? "" : "s"}
                </p>
                <p className="text-cp-muted">
                  {player.teamPointsFor} pts · {player.teamPlayed} match{player.teamPlayed === 1 ? "" : "es"}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TournamentSessionStatsPanel({
  variant,
  stats,
  emptyMessage,
}: TournamentSessionStatsPanelProps) {
  const copy = COPY[variant];
  const hasActivity = stats.completedMatches > 0 || stats.inProgressMatches > 0;
  const iconClass = variant === "reclub" ? "text-emerald-400" : "text-cp-primary";
  const leaderBadgeClass =
    variant === "reclub"
      ? cn("border-0", statusBadgeClass.reclub)
      : cn("border-0", statusBadgeClass.accent);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className={cn("h-5 w-5", iconClass)} />
          {copy.title}
        </h2>
        <p className="mt-1 text-sm text-cp-muted">{copy.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TournamentStatCard
          icon={Trophy}
          label="Matches played"
          value={String(stats.completedMatches)}
          variant={variant}
        />
        <TournamentStatCard
          icon={Users}
          label={copy.teamsKpi}
          value={String(stats.activeTeams)}
          variant={variant}
        />
        <TournamentStatCard
          icon={Users}
          label="Players"
          value={String(stats.totalPlayers)}
          variant={variant}
        />
        {stats.inProgressMatches > 0 ? (
          <TournamentStatCard
            icon={Swords}
            label="Live matches"
            value={String(stats.inProgressMatches)}
            variant={variant}
          />
        ) : null}
        {stats.avgDurationSeconds != null ? (
          <TournamentStatCard
            icon={Clock}
            label="Avg match time"
            value={formatStatDuration(stats.avgDurationSeconds)}
            variant={variant}
          />
        ) : null}
      </div>

      {!hasActivity ? (
        <EmptyStats message={emptyMessage ?? copy.emptyDefault} />
      ) : (
        <>
          <TournamentDetailSection
            title={copy.standingsTitle}
            icon={Trophy}
            iconClassName={iconClass}
            headerAside={
              stats.teams[0] ? (
                <Badge className={leaderBadgeClass}>
                  {copy.leaderBadge(stats.teams[0].name)}
                </Badge>
              ) : null
            }
          >
            {stats.teams.length > 0 ? (
              <TeamStandingsTable
                teams={stats.teams}
                variant={variant}
                teamLabel={copy.teamLabel}
                hint={copy.standingsHint}
              />
            ) : (
              <p className="text-sm text-cp-muted">No results recorded yet.</p>
            )}
          </TournamentDetailSection>

          {stats.players.length > 0 ? (
            <TournamentDetailSection
              title={copy.playersTitle}
              icon={Users}
              iconClassName={iconClass}
            >
              <PlayerActivityTable
                players={stats.players}
                variant={variant}
                teamLabel={copy.teamLabel}
                hint={copy.playersHint}
              />
            </TournamentDetailSection>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-cp-border bg-cp-card/60 px-4 py-3">
              <p className="text-xs font-medium text-cp-muted">Best score margin</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {stats.teams.length
                  ? (() => {
                      const best = [...stats.teams].sort(
                        (a, b) =>
                          b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst),
                      )[0]!;
                      const diff = best.pointsFor - best.pointsAgainst;
                      return `${best.name} (+${diff} pts)`;
                    })()
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-cp-muted">
                Scored more than conceded by the widest gap
              </p>
            </div>
            <div className="rounded-xl border border-cp-border bg-cp-card/60 px-4 py-3">
              <p className="text-xs font-medium text-cp-muted">Most wins</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {stats.teams[0]
                  ? `${stats.teams[0].name} · ${stats.teams[0].wins} win${stats.teams[0].wins === 1 ? "" : "s"}`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-cp-muted">{copy.mostWinsHint}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
