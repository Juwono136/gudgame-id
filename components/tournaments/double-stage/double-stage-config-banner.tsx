"use client";

import { getDoubleStageConfigSummary } from "@/lib/tournaments/double-stage/ui-helpers";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

type DoubleStageConfigBannerProps = {
  tournament: TournamentDetail;
  className?: string;
};

export function DoubleStageConfigBanner({ tournament, className }: DoubleStageConfigBannerProps) {
  const cfg = getDoubleStageConfigSummary(tournament);

  const chips = [
    `Up to ${cfg.maxTeamsPerGroup} teams / group`,
    `Top ${cfg.teamsAdvancePerGroup} advance`,
    `Standings: ${cfg.winPoints}W${cfg.allowDraw ? ` · ${cfg.drawPoints}D` : ""} · ${cfg.lossPoints}L`,
    cfg.scoringTypeLabel === "Points"
      ? `Match score: first to ${cfg.pointsPerMatch}`
      : cfg.scoringTypeLabel,
    `${cfg.courtCount} ${cfg.courtCount === 1 ? "court" : "courts"}`,
    cfg.maxTeams != null ? `Max ${cfg.maxTeams} teams` : null,
    `${cfg.playersPerTeam} players / team`,
    cfg.thirdPlaceEnabled ? "3rd place match" : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        "rounded-xl border border-cp-border bg-cp-elevated/40 px-3 py-3 sm:px-4",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
        Double stage settings
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-flex rounded-full border border-cp-border bg-cp-card px-2.5 py-1 text-[11px] font-medium text-foreground sm:text-xs"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
