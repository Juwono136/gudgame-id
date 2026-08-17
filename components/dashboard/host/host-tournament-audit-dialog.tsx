"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  GitBranch,
  Loader2,
  MapPin,
  RefreshCw,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentArchive } from "@/hooks/use-creator-tournament-history";
import type {
  AuditReportMatch,
  TournamentAuditReport,
} from "@/lib/tournaments/archives/audit-report";
import { cn } from "@/lib/utils";

type HostTournamentAuditDialogProps = {
  tournamentId: string | null;
  tournamentName?: string;
  onOpenChange: (open: boolean) => void;
};

type SectionId = "overview" | "teams" | "results" | "registrations";

const SECTIONS: { id: SectionId; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "Info" },
  { id: "teams", label: "Teams", short: "Teams" },
  { id: "results", label: "Results", short: "Scores" },
  { id: "registrations", label: "Entries", short: "Entries" },
];

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-cp-border bg-cp-elevated/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-cp-elevated px-2.5 py-1 text-xs text-cp-muted">
      {children}
    </span>
  );
}

function MatchRow({ match }: { match: AuditReportMatch }) {
  return (
    <li className="rounded-xl border border-cp-border bg-cp-elevated/20 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
          {match.label}
        </p>
        <span
          className={cn(
            "text-[11px] font-medium",
            match.statusLabel === "Completed" || match.statusLabel === "Walkover"
              ? "text-cp-primary"
              : "text-cp-muted",
          )}
        >
          {match.statusLabel}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              match.winner === match.teamA ? "text-foreground" : "text-cp-muted",
            )}
          >
            {match.teamA}
          </p>
          <p
            className={cn(
              "truncate text-sm font-medium",
              match.winner === match.teamB ? "text-foreground" : "text-cp-muted",
            )}
          >
            {match.teamB}
          </p>
        </div>
        <p className="shrink-0 text-base font-semibold tabular-nums text-foreground">
          {match.scoreLabel}
        </p>
      </div>
      {match.winner ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-cp-primary">
          <Trophy className="h-3 w-3" />
          Winner: {match.winner}
        </p>
      ) : null}
    </li>
  );
}

function OverviewSection({ report }: { report: TournamentAuditReport }) {
  const { overview, summary } = report;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cp-border bg-cp-elevated/20 p-4">
        <p className="text-base font-semibold text-foreground sm:text-lg">{overview.name}</p>
        <p className="mt-1 text-xs text-cp-muted sm:text-sm">
          Saved {overview.archivedAtLabel}
          {" · "}
          {overview.closedReasonLabel}
          {" · "}
          {overview.statsTierLabel}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {overview.typeLabel ? <MetaPill>{overview.typeLabel}</MetaPill> : null}
          {overview.formatLabel ? <MetaPill>{overview.formatLabel}</MetaPill> : null}
          {overview.billingLabel ? <MetaPill>{overview.billingLabel}</MetaPill> : null}
          {overview.categoryLabel ? <MetaPill>{overview.categoryLabel}</MetaPill> : null}
          <MetaPill>{overview.statusLabel}</MetaPill>
        </div>
        {overview.venue ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-cp-muted sm:text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {overview.venue}
          </p>
        ) : null}
        {overview.scheduleLabel ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-cp-muted sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {overview.scheduleLabel}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip icon={Users} label="Teams" value={summary.teamCount} />
        <StatChip icon={Users} label="Players" value={summary.playerCount} />
        <StatChip icon={GitBranch} label="Bracket" value={summary.bracketMatchCount} />
        <StatChip icon={Swords} label="Round games" value={summary.roundMatchCount} />
      </div>

      <div className="rounded-xl border border-cp-border/80 bg-cp-elevated/10 px-4 py-3 text-xs text-cp-muted sm:text-sm">
        <p className="inline-flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cp-primary" />
          <span>
            This is the locked final record for the event — roster, entries, and scores as they
            stood when the tournament closed. Use it to settle disputes or review results without
            changing live data.
          </span>
        </p>
        <p className="mt-2 pl-6">
          {summary.completedMatchCount} completed match
          {summary.completedMatchCount === 1 ? "" : "es"}
          {" · "}
          {summary.confirmedRegistrationCount} confirmed entr
          {summary.confirmedRegistrationCount === 1 ? "y" : "ies"}
        </p>
      </div>
    </div>
  );
}

function TeamsSection({ report }: { report: TournamentAuditReport }) {
  if (report.teams.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-cp-muted">No teams were recorded for this event.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {report.teams.map((team) => (
        <li
          key={team.id}
          className="rounded-xl border border-cp-border bg-cp-elevated/20 px-3 py-3 sm:px-4"
        >
          <p className="font-medium text-foreground">{team.name}</p>
          {team.players.length > 0 ? (
            <p className="mt-1 text-xs text-cp-muted sm:text-sm">{team.players.join(" · ")}</p>
          ) : (
            <p className="mt-1 text-xs text-cp-muted">No player names on file</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function ResultsSection({ report }: { report: TournamentAuditReport }) {
  const bracket = useMemo(
    () => report.matches.filter((m) => m.section === "bracket"),
    [report.matches],
  );
  const rounds = useMemo(
    () => report.matches.filter((m) => m.section === "rounds"),
    [report.matches],
  );

  if (report.matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-cp-muted">
        No match results were recorded for this event.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {bracket.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cp-muted">
            Bracket
          </h3>
          <ul className="space-y-2">
            {bracket.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </ul>
        </section>
      ) : null}
      {rounds.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cp-muted">
            Round robin / group play
          </h3>
          <ul className="space-y-2">
            {rounds.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RegistrationsSection({ report }: { report: TournamentAuditReport }) {
  if (report.registrations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-cp-muted">No registration entries were recorded.</p>
    );
  }
  return (
    <ul className="divide-y divide-cp-border rounded-xl border border-cp-border">
      {report.registrations.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 px-3 py-3 text-sm sm:px-4"
        >
          <span className="min-w-0 truncate font-medium text-foreground">{row.teamName}</span>
          <span className="shrink-0 text-xs text-cp-muted">{row.statusLabel}</span>
        </li>
      ))}
    </ul>
  );
}

export function HostTournamentAuditDialog({
  tournamentId,
  tournamentName,
  onOpenChange,
}: HostTournamentAuditDialogProps) {
  const [section, setSection] = useState<SectionId>("overview");
  const { data: archive, isPending, isError, error, refetch, isFetching } =
    useTournamentArchive(tournamentId);

  const report = archive?.report;
  const titleName = report?.overview.name ?? tournamentName ?? "Tournament";

  return (
    <Dialog
      open={Boolean(tournamentId)}
      onOpenChange={(open) => {
        if (!open) {
          setSection("overview");
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,40rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-cp-border bg-cp-card p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-cp-border px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-left">
            <FileText className="h-5 w-5 shrink-0 text-cp-primary" />
            Final event record
          </DialogTitle>
          <DialogDescription className="text-left">
            Locked summary of roster, entries, and scores after the event closed — for review and
            disputes, not day-to-day management.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {isPending ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner label="Loading final record…" />
            </div>
          ) : isError ? (
            <div className="space-y-4 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-300">
                {error instanceof Error ? error.message : "Could not load the final event record"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Try again
              </Button>
            </div>
          ) : report ? (
            <div className="space-y-4">
              <div
                className="flex gap-1 overflow-x-auto rounded-xl border border-cp-border bg-cp-elevated/30 p-1"
                role="tablist"
                aria-label="Final record sections"
              >
                {SECTIONS.map((item) => {
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={cn(
                        "min-w-0 flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors sm:text-sm",
                        active
                          ? "bg-cp-card text-foreground shadow-sm"
                          : "text-cp-muted hover:text-foreground",
                      )}
                      onClick={() => setSection(item.id)}
                    >
                      <span className="sm:hidden">{item.short}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {section === "overview" ? <OverviewSection report={report} /> : null}
              {section === "teams" ? <TeamsSection report={report} /> : null}
              {section === "results" ? <ResultsSection report={report} /> : null}
              {section === "registrations" ? <RegistrationsSection report={report} /> : null}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-cp-muted">
              No final record is available for {titleName} yet.
            </p>
          )}
        </div>

        {report ? (
          <div className="shrink-0 border-t border-cp-border px-4 py-3 sm:px-6">
            <p className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              Record saved {report.overview.archivedAtLabel}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
