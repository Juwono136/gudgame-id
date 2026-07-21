"use client";

import { AlertCircle, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PLAYER_TIER_LABELS,
  type PlayerTierLevel,
} from "@/lib/player/tier";
import { cn } from "@/lib/utils";

const TIER_BADGE_CLASS: Record<PlayerTierLevel, string> = {
  bronze: cn(
    "border-amber-800/30 bg-amber-900/10 text-amber-950",
    "dark:border-amber-700/40 dark:bg-amber-900/25 dark:text-amber-100",
  ),
  silver: cn(
    "border-slate-600/25 bg-slate-200/90 text-slate-800",
    "dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200",
  ),
  gold: cn(
    "border-amber-600/25 bg-amber-500/12 text-amber-900",
    "dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
  ),
  platinum: cn(
    "border-sky-600/25 bg-sky-500/12 text-sky-900",
    "dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200",
  ),
  international: cn(
    "border-rose-600/25 bg-rose-500/12 text-rose-900",
    "dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200",
  ),
};

type TournamentTierBadgesProps = {
  allowedTierLevels: PlayerTierLevel[] | null | undefined;
  className?: string;
  size?: "sm" | "md";
};

export function TournamentTierBadges({
  allowedTierLevels,
  className,
  size = "sm",
}: TournamentTierBadgesProps) {
  if (!allowedTierLevels?.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {allowedTierLevels.map((tier) => (
        <Badge
          key={tier}
          className={cn(
            "border font-semibold uppercase tracking-wider",
            TIER_BADGE_CLASS[tier],
            size === "sm" ? "text-[10px]" : "text-xs",
          )}
        >
          <Medal className="mr-1 h-3 w-3" />
          {PLAYER_TIER_LABELS[tier]}
        </Badge>
      ))}
    </div>
  );
}

type TournamentTierEligibilityNoticeProps = {
  restricted: boolean;
  eligible: boolean;
  allowedTierLabel?: string | null;
  playerTierLabel?: string | null;
  message?: string | null;
  className?: string;
  compact?: boolean;
};

export function TournamentTierEligibilityNotice({
  restricted,
  eligible,
  allowedTierLabel,
  playerTierLabel,
  message,
  className,
  compact = false,
}: TournamentTierEligibilityNoticeProps) {
  if (!restricted || !allowedTierLabel) return null;

  if (eligible) {
    return (
      <div
        className={cn(
          "rounded-xl border border-emerald-600/20 bg-emerald-500/8 px-3 py-2.5 text-xs leading-relaxed text-foreground",
          "dark:border-emerald-500/25 dark:bg-emerald-500/10",
          className,
        )}
      >
        <p className="font-medium text-emerald-800 dark:text-emerald-200">
          Tier requirement met
        </p>
        <p className="mt-1 text-cp-muted">
          Open to {allowedTierLabel}.
          {playerTierLabel ? ` Your tier: ${playerTierLabel}.` : null}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-600/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed",
        "dark:border-amber-500/30 dark:bg-amber-500/10",
        compact ? "py-2" : "py-2.5",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Tier requirement not met
          </p>
          <p className="mt-1 text-amber-950/90 dark:text-amber-100/90">
            {message ??
              `This tournament is open to ${allowedTierLabel} players only.`}
          </p>
        </div>
      </div>
    </div>
  );
}
