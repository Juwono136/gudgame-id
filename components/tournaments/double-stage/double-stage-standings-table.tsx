"use client";

import { Badge } from "@/components/ui/badge";
import { TeamAvatarStack, TeamPlayerList } from "@/components/tournaments/team-player-list";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import { cn } from "@/lib/utils";

type DoubleStageStandingsTableProps = {
  group: GroupOverview;
  showQualification?: boolean;
  compact?: boolean;
  /** Venue TV: text-only team + player names (no profile avatars). */
  displayMode?: boolean;
  /**
   * diff = +/- points; games = race-to-N games W–L; sets = classic ITF/FIP sets W–L
   * (games column also shown when sets + gamesFor available).
   */
  scoreDisplay?: "diff" | "games" | "sets";
  /** Per-group legends are omitted by default — use {@link DoubleStageStandingsLegend} once above. */
  showLegend?: boolean;
  /** Show GW% column (Bestie Cup / Modified Swiss pool ranking). */
  showGameWinPct?: boolean;
};

export type StandingsLegendItem = { key: string; label: string };

export function getDoubleStageStandingsLegend(
  scoreDisplay: "diff" | "games" | "sets" = "diff",
  showGameWinPct = false,
): StandingsLegendItem[] {
  const showGames = scoreDisplay === "games";
  const showSets = scoreDisplay === "sets";
  return [
    { key: "G", label: "Matches played in the group" },
    { key: "W", label: "Match wins" },
    { key: "L", label: "Match losses" },
    {
      key: "WR",
      label: "Match win rate (%) = wins ÷ matches played",
    },
    ...(showGameWinPct
      ? [
          {
            key: "GW%",
            label: "Game win % = games won ÷ (games won + games lost)",
          },
        ]
      : []),
    showSets
      ? { key: "SET", label: "Sets won–lost (ITF/FIP classic)" }
      : showGames
        ? {
            key: "S",
            label:
              "Total games won–lost across all matches (Race to N applies per match only)",
          }
        : { key: "S", label: "Score difference (points for − against)" },
    ...(showSets
      ? [{ key: "GM", label: "Games won–lost across all sets" }]
      : []),
    { key: "PTS", label: "Standings points" },
  ];
}

export function DoubleStageStandingsLegend({
  scoreDisplay = "diff",
  showGameWinPct = false,
  className,
}: {
  scoreDisplay?: "diff" | "games" | "sets";
  showGameWinPct?: boolean;
  className?: string;
}) {
  const legend = getDoubleStageStandingsLegend(scoreDisplay, showGameWinPct);
  return (
    <ul
      className={cn(
        "flex flex-wrap flex-col gap-x-4 gap-y-1 text-[10px] leading-snug text-cp-muted sm:text-xs",
        className,
      )}
      aria-label="Standings column legend"
    >
      {legend.map((item) => (
        <li key={item.key} className="inline-flex items-baseline gap-1">
          <span className="font-semibold tabular-nums text-foreground">{item.key}</span>
          <span className="text-cp-muted">= {item.label}</span>
        </li>
      ))}
    </ul>
  );
}

const thStat =
  "px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:px-2 sm:text-xs";
const tdStat =
  "px-1.5 py-2 text-center tabular-nums whitespace-nowrap sm:px-2";

const thStatDisplay =
  "px-1 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white/45 sm:px-1.5 sm:text-[10px]";
const tdStatDisplay =
  "px-1 py-1.5 text-center tabular-nums whitespace-nowrap text-white/90 sm:px-1.5 sm:text-xs";

export function DoubleStageStandingsTable({
  group,
  showQualification = false,
  compact = false,
  displayMode = false,
  scoreDisplay = "diff",
  showLegend = false,
  showGameWinPct = false,
}: DoubleStageStandingsTableProps) {
  const showGames = scoreDisplay === "games";
  const showSets = scoreDisplay === "sets";
  const scoreTitle = showSets
    ? "Sets won – lost"
    : showGames
      ? "Total games won – lost (sum of all matches)"
      : "Skor (score difference)";

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "overflow-hidden rounded-lg border",
          displayMode ? "border-white/10 bg-black/20" : "overflow-x-auto border-cp-border",
        )}
      >
        <table
          className={cn(
            "w-full text-sm",
            displayMode ? "table-auto" : "table-fixed",
            !displayMode &&
              (showSets ? "min-w-[30rem]" : showGameWinPct ? "min-w-[28rem]" : "min-w-[26rem]"),
            compact && "text-xs",
            displayMode && "text-[11px] sm:text-xs",
          )}
        >
          {!displayMode ? (
            <colgroup>
              <col className="w-8" />
              <col />
              <col className="w-9" />
              <col className="w-9" />
              <col className="w-9" />
              <col className="w-12" />
              {showGameWinPct ? <col className="w-[3.25rem]" /> : null}
              <col className="w-[3.25rem]" />
              {showSets ? <col className="w-[3.25rem]" /> : null}
              <col className="w-11" />
            </colgroup>
          ) : null}
          <thead>
            <tr
              className={cn(
                "border-b",
                displayMode
                  ? "border-white/10 bg-white/[0.06]"
                  : "border-cp-border bg-cp-elevated/40",
              )}
            >
              <th
                className={cn(
                  displayMode ? thStatDisplay : thStat,
                  "w-8 text-left",
                )}
              >
                #
              </th>
              <th
                className={cn(
                  displayMode
                    ? "px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-white/45 sm:px-2.5 sm:text-[10px]"
                    : "px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-cp-muted sm:px-3 sm:text-xs",
                )}
              >
                Team
              </th>
              <th className={displayMode ? thStatDisplay : thStat} title="Games played (matches)">
                G
              </th>
              <th className={displayMode ? thStatDisplay : thStat} title="Wins">
                W
              </th>
              <th className={displayMode ? thStatDisplay : thStat} title="Losses">
                L
              </th>
              <th
                className={displayMode ? thStatDisplay : thStat}
                title="Match win rate (%) = wins ÷ matches played"
              >
                WR
              </th>
              {showGameWinPct ? (
                <th
                  className={displayMode ? thStatDisplay : thStat}
                  title="Game win % = games won ÷ (games won + games lost)"
                >
                  GW%
                </th>
              ) : null}
              <th className={displayMode ? thStatDisplay : thStat} title={scoreTitle}>
                {showSets ? "SET" : "S"}
              </th>
              {showSets ? (
                <th className={displayMode ? thStatDisplay : thStat} title="Games won – lost">
                  GM
                </th>
              ) : null}
              <th className={displayMode ? thStatDisplay : thStat} title="Standings points">
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((row) => (
              <tr
                key={row.teamId}
                className={cn(
                  "border-b last:border-0",
                  displayMode
                    ? "border-white/[0.06] even:bg-white/[0.03]"
                    : "border-cp-border/50 even:bg-cp-elevated/15",
                )}
              >
                <td
                  className={cn(
                    displayMode ? tdStatDisplay : tdStat,
                    "text-left font-medium",
                  )}
                >
                  {row.rank}
                </td>
                <td className={cn("min-w-0 py-1.5", displayMode ? "px-2 sm:px-2.5" : "px-2 sm:px-3")}>
                  <div className={cn("min-w-0", !displayMode && "flex items-start gap-2")}>
                    {!displayMode ? (
                      <TeamAvatarStack
                        members={row.players.map((p) => ({
                          name: p.displayName,
                          image: p.image,
                        }))}
                        max={3}
                        className="mt-0.5 hidden shrink-0 sm:flex"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-semibold leading-tight",
                          displayMode
                            ? "text-[11px] text-white sm:text-xs"
                            : "break-words font-medium text-foreground sm:truncate",
                        )}
                        title={row.teamName}
                      >
                        {row.teamName}
                      </p>
                      {row.players.length > 0 ? (
                        displayMode ? (
                          <p
                            className="mt-0.5 text-[9px] leading-snug text-white/50 sm:text-[10px]"
                            title={row.players.map((p) => p.displayName).join(", ")}
                          >
                            {row.players.map((p) => p.displayName).join(" · ")}
                          </p>
                        ) : (
                          <>
                            <p
                              className="mt-0.5 break-words text-[10px] leading-snug text-cp-muted sm:hidden"
                              title={row.players.map((p) => p.displayName).join(", ")}
                            >
                              {row.players.map((p) => p.displayName).join(" · ")}
                            </p>
                            <TeamPlayerList
                              names={row.players}
                              maxNames={4}
                              compact={compact}
                              variant="avatar"
                              className="hidden sm:block"
                            />
                          </>
                        )
                      ) : null}
                      {showQualification && row.qualificationStatus !== "pending" ? (
                        <Badge
                          variant="muted"
                          className={cn(
                            "mt-1 text-[10px]",
                            row.qualificationStatus === "qualified"
                              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                              : "opacity-70",
                          )}
                        >
                          {row.qualificationStatus === "qualified" ? "Qualified" : "Eliminated"}
                        </Badge>
                      ) : null}
                      {row.needsManualResolution ? (
                        <Badge
                          variant="warning"
                          className="mt-1 text-[10px] normal-case tracking-normal"
                        >
                          Tie — resolve manually
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className={displayMode ? tdStatDisplay : tdStat}>{row.played}</td>
                <td className={displayMode ? tdStatDisplay : tdStat}>{row.wins}</td>
                <td className={displayMode ? tdStatDisplay : tdStat}>{row.losses}</td>
                <td className={cn(displayMode ? tdStatDisplay : tdStat, !displayMode && "text-cp-muted")}>
                  {row.winRate}
                  <span className="text-[9px] opacity-70">%</span>
                </td>
                {showGameWinPct ? (
                  <td className={cn(displayMode ? tdStatDisplay : tdStat, !displayMode && "text-[11px] font-medium sm:text-sm")}>
                    {typeof row.gameWinPct === "number"
                      ? row.gameWinPct.toFixed(2)
                      : "0.00"}
                    <span className="text-[9px] opacity-70">%</span>
                  </td>
                ) : null}
                <td className={cn(displayMode ? tdStatDisplay : tdStat, !displayMode && "text-[11px] sm:text-sm")}>
                  {showSets
                    ? `${row.setsFor}–${row.setsAgainst}`
                    : showGames
                      ? `${row.scoreFor}–${row.scoreAgainst}`
                      : row.scoreDiff}
                </td>
                {showSets ? (
                  <td className={cn(displayMode ? tdStatDisplay : tdStat, !displayMode && "text-[11px] sm:text-sm")}>
                    {row.gamesFor}–{row.gamesAgainst}
                  </td>
                ) : null}
                <td className={cn(displayMode ? tdStatDisplay : tdStat, "font-semibold")}>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showLegend ? (
        <DoubleStageStandingsLegend scoreDisplay={scoreDisplay} showGameWinPct={showGameWinPct} />
      ) : null}
    </div>
  );
}
