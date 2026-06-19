"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Lock,
  Pencil,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  upcoming: "bg-blue-500/20 text-blue-300",
  live: "bg-emerald-500/20 text-emerald-300",
  completed: "bg-cp-muted/20 text-cp-muted",
  cancelled: "bg-red-500/20 text-red-300",
};

export const ICON_ACTION_CLASS =
  "shrink-0 border-cp-border/80 bg-cp-elevated/30 text-cp-muted hover:border-cp-primary/40 hover:bg-cp-primary/10 hover:text-cp-primary";

const MOBILE_TOOLBAR_ACTION_CLASS =
  "h-11 w-full flex-col gap-1 rounded-xl border-cp-border/80 bg-cp-elevated/30 py-2.5 text-cp-muted hover:border-cp-primary/40 hover:bg-cp-primary/10 hover:text-cp-primary sm:h-9 sm:w-9 sm:flex-row sm:gap-0 sm:rounded-md sm:py-0";

export function TournamentTypeBadge({ tournamentType }: { tournamentType: string }) {
  const isOfficial = tournamentType === "official";
  return (
    <Badge
      className={cn(
        "gap-1 border-0 text-[10px] uppercase",
        isOfficial ? "bg-cp-primary/20 text-cp-primary" : "bg-emerald-500/20 text-emerald-300",
      )}
    >
      {isOfficial ? <Trophy className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
      {isOfficial ? "Official" : "Reclub"}
    </Badge>
  );
}

export function TournamentStatusBadge({
  status,
  size = "default",
}: {
  status: string;
  size?: "default" | "lg";
}) {
  return (
    <Badge
      className={cn(
        "gap-1.5 border-0 capitalize",
        size === "lg" && "px-3 py-1 text-sm",
        STATUS_BADGE_STYLES[status],
      )}
    >
      {status === "live" ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      ) : null}
      {status}
    </Badge>
  );
}

function formatScheduleHint(startsAt?: string | null, endsAt?: string | null): string | null {
  const formatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const start = startsAt ? formatter.format(new Date(startsAt)) : null;
  const end = endsAt ? formatter.format(new Date(endsAt)) : null;
  if (start && end) return `${start} → ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return null;
}

/** Read-only status panel — lifecycle is managed automatically by the app. */
export function TournamentStatusPanel({
  status,
  startsAt,
  endsAt,
  className,
}: {
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  className?: string;
}) {
  const scheduleHint = formatScheduleHint(startsAt, endsAt);
  const isManualStatus = status === "draft" || status === "cancelled";

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-cp-border/80 bg-gradient-to-br from-cp-elevated/50 via-cp-card to-cp-card p-3.5 sm:min-w-[14rem]",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cp-border/60 bg-cp-primary/10">
          <CalendarClock className="h-4 w-4 text-cp-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cp-muted">
            Event status
          </p>
          <div className="mt-2">
            <TournamentStatusBadge status={status} size="lg" />
          </div>
          {scheduleHint && !isManualStatus ? (
            <p className="mt-1.5 text-[10px] leading-relaxed text-cp-text-dim">{scheduleHint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type HostTournamentIconActionsProps = {
  tournamentId: number;
  sportSlug: string;
  slug: string;
  canEdit?: boolean;
  onEditDisabled?: () => void;
  onDelete: () => void;
  deletePending?: boolean;
  showWorkspaceLink?: boolean;
  className?: string;
};

export function HostTournamentIconActions({
  tournamentId,
  sportSlug,
  slug,
  canEdit = true,
  onEditDisabled,
  onDelete,
  deletePending,
  showWorkspaceLink = false,
  className,
}: HostTournamentIconActionsProps) {
  const workspaceHref = dashboardRoutes.hostTournament(tournamentId);
  const publicHref = publicSportRoutes.tournament(sportSlug, slug);
  const editHref = dashboardRoutes.hostTournamentEdit(tournamentId);

  return (
    <div
      className={cn(
        "grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:justify-end sm:gap-1",
        className,
      )}
    >
      {canEdit ? (
        <Button
          asChild
          size="icon"
          variant="outline"
          className={cn(MOBILE_TOOLBAR_ACTION_CLASS, ICON_ACTION_CLASS, "sm:size-icon")}
          title="Edit tournament"
        >
          <Link href={editHref} aria-label="Edit tournament" className="flex flex-col items-center sm:flex-row">
            <Pencil className="h-4 w-4" />
            <span className="text-[10px] font-medium sm:hidden">Edit</span>
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(MOBILE_TOOLBAR_ACTION_CLASS, ICON_ACTION_CLASS, "sm:size-icon")}
          title="Edit tournament"
          aria-label="Edit tournament"
          onClick={onEditDisabled}
        >
          <Pencil className="h-4 w-4" />
          <span className="text-[10px] font-medium sm:hidden">Edit</span>
        </Button>
      )}

      <Button
        asChild
        size="icon"
        variant="outline"
        className={cn(MOBILE_TOOLBAR_ACTION_CLASS, ICON_ACTION_CLASS, "sm:size-icon")}
        title="Public page"
      >
        <Link
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open public page"
          className="flex flex-col items-center sm:flex-row"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="text-[10px] font-medium sm:hidden">Public</span>
        </Link>
      </Button>

      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={deletePending}
        className={cn(
          MOBILE_TOOLBAR_ACTION_CLASS,
          ICON_ACTION_CLASS,
          "border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 sm:size-icon",
        )}
        title="Delete tournament"
        aria-label="Delete tournament"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        <span className="text-[10px] font-medium sm:hidden">Delete</span>
      </Button>

      {showWorkspaceLink ? (
        <Button
          asChild
          size="icon"
          variant="outline"
          className={cn(ICON_ACTION_CLASS, "hidden sm:inline-flex")}
          title="Open workspace"
        >
          <Link href={workspaceHref} aria-label="Open tournament workspace">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function WorkspaceStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-cp-border bg-cp-card p-3 sm:p-4 cp-shadow-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cp-primary/10">
        <Icon className="h-4 w-4 text-cp-primary" />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold text-foreground sm:text-xl">{value}</p>
    </div>
  );
}

export function WorkspaceSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-cp-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
