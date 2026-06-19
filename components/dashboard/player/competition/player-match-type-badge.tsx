"use client";

import { Badge } from "@/components/ui/badge";
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
        isOfficial ? "bg-cp-primary/15 text-cp-primary" : "bg-emerald-500/15 text-emerald-300",
        className,
      )}
    >
      {isOfficial ? "Official" : "Reclub"}
    </Badge>
  );
}
