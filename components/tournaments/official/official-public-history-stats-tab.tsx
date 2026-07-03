"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, History, ListOrdered } from "lucide-react";
import {
  OfficialPointLogTimeline,
  type PointLogMatchContext,
} from "@/components/tournaments/official/official-point-log-timeline";
import { OfficialPlayerStandingsTable } from "@/components/tournaments/official/official-player-standings-table";
import { OfficialPublicBracketTab } from "@/components/tournaments/official/official-public-bracket-tab";
import {
  FunMatchSquadStandingsTable,
} from "@/components/tournaments/fun-match/fun-match-standings-table";
import { TournamentRoundHistorySection } from "@/components/tournaments/tournament-round-history-section";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import type { ReclubMatchView } from "@/lib/tournaments/reclub/types";
import type { LobbyTeamView } from "@/lib/tournaments/reclub/teams";
import { formatStatDuration } from "@/lib/tournaments/stats/compute";
import { computeOfficialPlayerStandings } from "@/lib/tournaments/stats/official-standings";
import type { HistoryRoundItem } from "@/lib/tournaments/stats/map-history-items";
import { formatPlayerNameList } from "@/lib/format/player-names";
import type { TournamentSessionStats } from "@/lib/tournaments/stats/types";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import { cn } from "@/lib/utils";

type OfficialPublicHistoryStatsTabProps = {
  tournament: TournamentDetail;
  bracketMatches: BracketMatchView[];
  reclubMatches: ReclubMatchView[];
  teams: LobbyTeamView[];
  sessionStats: TournamentSessionStats;
  historyItems: HistoryRoundItem[];
  participant: TournamentParticipantContext;
  isElimination: boolean;
  userTeamId?: string | null;
};

export function OfficialPublicHistoryStatsTab({
  tournament,
  bracketMatches,
  reclubMatches,
  teams,
  sessionStats,
  historyItems,
  participant,
  isElimination,
  userTeamId = null,
}: OfficialPublicHistoryStatsTabProps) {
  const completedCount = useMemo(() => {
    const bracketDone = bracketMatches.filter((m) => m.status === "completed").length;
    const reclubDone = reclubMatches.filter((m) => m.status === "completed").length;
    return bracketDone + reclubDone;
  }, [bracketMatches, reclubMatches]);

  const { players, squads } = useMemo(
    () => computeOfficialPlayerStandings(bracketMatches, reclubMatches, teams),
    [bracketMatches, reclubMatches, teams],
  );

  const loggedMatches = useMemo(() => {
    const rows: Array<{
      id: string;
      title: string;
      sub: string;
      events: NonNullable<BracketMatchView["scoreEvents"]>;
      context: PointLogMatchContext;
    }> = [];
    for (const m of bracketMatches) {
      const events = m.scoreEvents ?? [];
      if (!events.length) continue;
      const playerLineA = formatPlayerNameList(m.teamAPlayers);
      const playerLineB = formatPlayerNameList(m.teamBPlayers);
      rows.push({
        id: m.id,
        title: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
        sub: [
          `R${m.roundNumber} · M${m.matchNumber}`,
          playerLineA || playerLineB ? `${playerLineA || "—"} vs ${playerLineB || "—"}` : null,
          `${events.length} events`,
        ]
          .filter(Boolean)
          .join(" | "),
        events,
        context: {
          teamAName: m.teamAName,
          teamBName: m.teamBName,
          teamAPlayers: m.teamAPlayers,
          teamBPlayers: m.teamBPlayers,
        },
      });
    }
    for (const m of reclubMatches) {
      const events = m.scoreEvents ?? [];
      if (!events.length) continue;
      const playerLineA = formatPlayerNameList(m.teamAPlayers);
      const playerLineB = formatPlayerNameList(m.teamBPlayers);
      rows.push({
        id: m.id,
        title: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
        sub: [
          m.roundLabel ?? `Round ${m.roundNumber}`,
          playerLineA || playerLineB ? `${playerLineA || "—"} vs ${playerLineB || "—"}` : null,
          `${events.length} events`,
        ]
          .filter(Boolean)
          .join(" | "),
        events,
        context: {
          teamAName: m.teamAName,
          teamBName: m.teamBName,
          teamAPlayers: m.teamAPlayers,
          teamBPlayers: m.teamBPlayers,
        },
      });
    }
    return rows;
  }, [bracketMatches, reclubMatches]);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedMatches.length) {
      setSelectedMatchId(null);
      return;
    }
    if (!selectedMatchId || !loggedMatches.some((m) => m.id === selectedMatchId)) {
      setSelectedMatchId(loggedMatches[0]!.id);
    }
  }, [loggedMatches, selectedMatchId]);

  const selectedMatch = useMemo(
    () => loggedMatches.find((m) => m.id === selectedMatchId) ?? loggedMatches[0] ?? null,
    [loggedMatches, selectedMatchId],
  );

  const squadRows = squads;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-cp-primary" />
          Tournament stats
        </h2>
        <p className="mt-1 text-sm text-cp-muted">
          Squad and player performance from every official match
          {tournament.categoryLabel ? ` · ${tournament.categoryLabel} category` : ""}.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Matches played", value: String(completedCount) },
            {
              label: "Squads",
              value: String(teams.filter((t) => t.memberCount > 0).length),
            },
            {
              label: "Players",
              value: String(teams.reduce((n, t) => n + t.memberCount, 0)),
            },
            {
              label: "Avg match time",
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
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Squad standings</h3>
            <div className="mt-3">
              <FunMatchSquadStandingsTable rows={squadRows} accentVariant="official" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Player standings</h3>
            <p className="mt-1 text-xs text-cp-muted">
              Includes ranking points, point differential, points scored, and logged scoring actions.
            </p>
            <div className="mt-3">
              <OfficialPlayerStandingsTable rows={players} />
            </div>
          </div>
        </div>
      </section>

      {historyItems.length > 0 ? (
        <TournamentRoundHistorySection
          variant="official"
          title="Match history"
          items={historyItems}
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 p-6 text-center">
          <History className="mx-auto h-6 w-6 text-cp-muted/50" />
          <p className="mt-2 text-sm text-cp-muted">
            Match history appears after official matches are finalized.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-cp-primary/20 bg-cp-card p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ListOrdered className="h-4 w-4 text-cp-primary" />
          Point-by-point logs
        </h3>
        <p className="mt-1 text-sm text-cp-muted">
          Timestamped record of every scoring action during official matches.
        </p>

        {loggedMatches.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                Matches with logs
              </p>
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 sm:max-h-64 [scrollbar-width:thin]">
                {loggedMatches.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMatchId(item.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        selectedMatchId === item.id
                          ? "border-cp-primary/40 bg-cp-primary/10"
                          : "border-cp-border/70 hover:bg-cp-elevated/30",
                      )}
                    >
                      <span className="font-medium text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-cp-muted">{item.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <OfficialPointLogTimeline
              events={selectedMatch?.events ?? []}
              matchContext={selectedMatch?.context}
            />
          </div>
        ) : (
          <div className="mt-4">
            <OfficialPointLogTimeline events={[]} />
          </div>
        )}
      </section>

      {isElimination ? (
        <section>
          <h3 className="mb-4 text-base font-semibold text-foreground">Bracket history</h3>
          <OfficialPublicBracketTab
            sportSlug={tournament.sportSlug}
            slug={tournament.slug}
            participant={participant}
            tournamentStatus={tournament.status}
            userTeamId={userTeamId}
            historyOnly
          />
        </section>
      ) : null}
    </div>
  );
}
