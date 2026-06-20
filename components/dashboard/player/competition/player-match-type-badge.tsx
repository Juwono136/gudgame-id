"use client";

import { Badge } from "@/components/ui/badge";
import { getTournamentTypeBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type PlayerMatchTypeBadgeProps = {
  tournamentType: "official" | "recreational";
  className?: string;
};

export function PlayerMatchTypeBadge({ tournamentType, className }: PlayerMatchTypeBadgeProps) {
  const isOfficial = tournamentType === "official";
  return (
    <Badge
      className={cn(
        "w-fit shrink-0 border-0 text-[10px] font-semibold uppercase tracking-wide",
        getTournamentTypeBadgeClass(isOfficial ? "official" : "recreational"),
        className,
      )}
    >
      {isOfficial ? "Official" : "Reclub"}
    </Badge>
  );
}
