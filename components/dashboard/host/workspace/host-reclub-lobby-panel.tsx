"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Swords, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceSection } from "@/components/dashboard/host/host-tournament-ui";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import { cn } from "@/lib/utils";

type HostReclubLobbyPanelProps = {
  sportSlug: string;
  tournamentSlug: string;
  teams: LobbyTeamView[];
  matches: ReclubMatchView[];
  playersPerTeam: number;
};

function LobbyTeamCard({
  team,
  playersPerTeam,
  index,
}: {
  team: LobbyTeamView;
  playersPerTeam: number;
  index: number;
}) {
  const isEmpty = team.memberCount === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-cp-border bg-cp-card p-4",
        isEmpty && "border-dashed bg-cp-elevated/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words font-semibold text-foreground">{team.name}</p>
        <Badge
          variant="muted"
          className={cn("shrink-0 tabular-nums", isEmpty && "text-cp-muted")}
        >
          {team.memberCount}/{playersPerTeam}
        </Badge>
      </div>
      <ul className="mt-3 min-h-[2rem] space-y-1.5">
        {team.members.length ? (
          team.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 text-sm text-cp-muted">
              <Users className="h-3.5 w-3.5 shrink-0 text-cp-text-dim" />
              <span className="truncate">{m.displayName}</span>
            </li>
          ))
        ) : (
          <li className="text-sm italic text-cp-muted">Empty squad</li>
        )}
      </ul>
    </motion.div>
  );
}

function MatchHistoryRow({ match }: { match: ReclubMatchView }) {
  const label = match.roundLabel ?? `Round ${match.roundNumber}`;

  return (
    <li className="rounded-xl border border-cp-border bg-cp-card px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2 sm:w-28 sm:shrink-0">
          <Swords className="h-3.5 w-3.5 shrink-0 text-cp-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-cp-muted">
            {label}
          </span>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
          <span className="truncate text-right font-medium text-foreground">
            {match.teamAName ?? "TBD"}
          </span>
          <span className="rounded-lg bg-cp-elevated px-2.5 py-1 text-center text-xs font-bold tabular-nums text-foreground sm:text-sm">
            {match.scoreA ?? "–"} : {match.scoreB ?? "–"}
          </span>
          <span className="truncate font-medium text-foreground">{match.teamBName ?? "TBD"}</span>
        </div>
      </div>
    </li>
  );
}

export function HostReclubLobbyPanel({
  sportSlug,
  tournamentSlug,
  teams,
  matches,
  playersPerTeam,
}: HostReclubLobbyPanelProps) {
  const publicHref = publicSportRoutes.tournament(sportSlug, tournamentSlug);

  return (
    <WorkspaceSection
      title="Lobby & rounds"
      description="Squads and match results from your Fun Match. Run live rounds on the public lobby page."
      className="mt-8 sm:mt-10"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-cp-muted">
          {teams.length} squad{teams.length === 1 ? "" : "s"} · {matches.length} match
          {matches.length === 1 ? "" : "es"} played
        </p>
        <Button asChild variant="outline" size="sm" className="h-9 w-full border-cp-border sm:w-auto">
          <Link href={publicHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open public lobby
          </Link>
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cp-border px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No squads yet</p>
          <p className="mt-1 text-sm text-cp-muted">
            Players join squads from the public Fun Match lobby page.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 h-9 border-cp-border">
            <Link href={publicHref} target="_blank" rel="noopener noreferrer">
              Open public lobby
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team, i) => (
            <LobbyTeamCard key={team.id} team={team} playersPerTeam={playersPerTeam} index={i} />
          ))}
        </div>
      )}

      {matches.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Match history</h3>
          <ul className="mt-3 space-y-2">
            {matches.map((m) => (
              <MatchHistoryRow key={m.id} match={m} />
            ))}
          </ul>
        </div>
      ) : teams.length > 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-cp-border px-4 py-8 text-center text-sm text-cp-muted">
          No matches recorded yet. Start a round from the public lobby.
        </p>
      ) : null}
    </WorkspaceSection>
  );
}
