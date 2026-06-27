"use client";

import { Badge } from "@/components/ui/badge";
import { getPublicTournamentTypeLabel } from "@/lib/tournaments/constants";
import { getTournamentTypeBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type PlayerMatchTypeBadgeProps = {
  tournamentType: "official" | "fun_match";
  className?: string;
};

export function PlayerMatchTypeBadge({ tournamentType, className }: PlayerMatchTypeBadgeProps) {
  const isOfficial = tournamentType === "official";
  return (
    <Badge
      className={cn(
        "w-fit shrink-0 border-0 text-[10px] font-semibold uppercase tracking-wide",
        getTournamentTypeBadgeClass(isOfficial ? "official" : "fun_match"),
        className,
      )}
    >
      {getPublicTournamentTypeLabel(tournamentType)}
    </Badge>
  );
}
