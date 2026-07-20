import { cn } from "@/lib/utils";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";

/** Theme-aware status / state pill classes (light + dark). */
export const statusBadgeClass = {
  success: cn(
    "border-emerald-700/30 bg-emerald-500/12 text-emerald-900",
    "dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200",
  ),
  info: cn(
    "border-emerald-700/30 bg-emerald-600/12 text-emerald-900",
    "dark:border-cp-primary/40 dark:bg-cp-primary/20 dark:text-cp-logo-accent",
  ),
  warning: cn(
    "border-amber-600/25 bg-amber-500/12 text-amber-900",
    "dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200",
  ),
  danger: cn(
    "border-red-600/25 bg-red-500/10 text-red-800",
    "dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-300",
  ),
  muted: cn("border-cp-border bg-cp-elevated text-cp-muted"),
  price: cn(
    "border-emerald-600/25 bg-emerald-500/12 text-emerald-700",
    "dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200",
  ),
  accent: cn(
    "border-emerald-700/30 bg-emerald-600/15 text-emerald-900",
    "dark:border-cp-primary/40 dark:bg-cp-primary/20 dark:text-cp-logo-accent",
  ),
  sky: cn(
    "border-sky-600/25 bg-sky-500/12 text-sky-800",
    "dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-200",
  ),
  slate: cn(
    "border-slate-600/30 bg-slate-200/90 text-slate-800",
    "dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300",
  ),
  reclub: cn(
    "border-emerald-700/30 bg-emerald-600/15 text-emerald-900",
    "dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  ),
} as const;

export const tournamentStatusBadgeClass: Record<string, string> = {
  draft: statusBadgeClass.slate,
  upcoming: statusBadgeClass.info,
  live: statusBadgeClass.success,
  completed: statusBadgeClass.muted,
  cancelled: statusBadgeClass.danger,
};

export const sessionPhaseBadgeClass = {
  upcoming: statusBadgeClass.sky,
  live: statusBadgeClass.success,
  ended: statusBadgeClass.muted,
} as const;

export const sessionPhaseContainerClass = {
  upcoming: "border-sky-500/25 bg-sky-500/5",
  live: cn("border-emerald-600/20 bg-emerald-500/5", "dark:border-emerald-500/30"),
  ended: "border-cp-border/80 bg-cp-elevated/30",
} as const;

export const reclubTabActiveClass = cn(
  "bg-emerald-500/12 text-emerald-800",
  "dark:bg-emerald-500/15 dark:text-emerald-300",
);

export const officialTabActiveClass = "bg-cp-primary/15 text-cp-primary";

export const paymentStatusBadgeClass: Record<string, string> = {
  paid: statusBadgeClass.success,
  pending: statusBadgeClass.warning,
  expired: statusBadgeClass.slate,
  failed: statusBadgeClass.danger,
  refunded: statusBadgeClass.sky,
};

export const disbursementStatusBadgeClass: Record<string, string> = {
  pending: statusBadgeClass.slate,
  accepted: statusBadgeClass.sky,
  requested: statusBadgeClass.sky,
  succeeded: statusBadgeClass.success,
  failed: statusBadgeClass.danger,
  cancelled: statusBadgeClass.muted,
  reversed: statusBadgeClass.warning,
};

export function getTournamentTypeBadgeClass(tournamentType: string): string {
  return tournamentType === "official" ? statusBadgeClass.accent : statusBadgeClass.reclub;
}

export function getDirectoryStatusBadgeClass(item: WikiDirectoryListItem): string {
  if (item.recordKind === "tournament") {
    if (item.status === "live") return statusBadgeClass.success;
    if (item.status === "upcoming") return statusBadgeClass.info;
    if (item.status === "cancelled") return statusBadgeClass.danger;
    return statusBadgeClass.muted;
  }
  if (item.status === "published") return statusBadgeClass.success;
  if (item.status === "archived") return statusBadgeClass.muted;
  return statusBadgeClass.muted;
}

export function getTournamentStatusBadgeClass(status: string): string {
  return tournamentStatusBadgeClass[status] ?? statusBadgeClass.muted;
}

/** Frosted hero overlay — combine with a status class for tournament banners. */
export const tournamentHeroStatusBadgeBase =
  "border-0 uppercase backdrop-blur-sm";

/** Theme-aware inline alert panels (not pill badges). */
export const alertPanelClass = {
  warning: cn(
    "rounded-xl border border-amber-600/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-950",
    "dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  ),
  info: cn(
    "rounded-xl border border-cp-primary/25 bg-cp-primary/8 p-4 text-sm leading-relaxed text-foreground",
    "dark:border-cp-primary/30 dark:bg-cp-primary/10",
  ),
} as const;
