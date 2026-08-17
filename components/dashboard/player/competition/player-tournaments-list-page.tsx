"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Gamepad2,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Swords,
  Trash2,
  Trophy,
} from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { PlayerMatchHistoryPanel } from "@/components/dashboard/player/competition/player-match-history-panel";
import {
  TournamentStatusBadge,
  TournamentTypeBadge,
} from "@/components/dashboard/host/host-tournament-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import { useDebounce } from "@/hooks/use-debounce";
import { useDeleteManageTournament } from "@/hooks/use-manage-tournament";
import { usePlayerTournamentsList } from "@/hooks/use-player-competition";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PlayerTournamentsListQuery } from "@/lib/validations/player-competition";
import type { PlayerTournamentListItem } from "@/lib/account/player-competition/types";
import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/constants";
import { getTournamentFormatLabel } from "@/lib/tournaments/settings";
import { formatTournamentListSchedule } from "@/lib/tournaments/format-schedule";
import {
  formatPlayerTournamentResult,
} from "@/lib/account/player-competition/format-outcome";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";
import { WorkspaceScopeTabs } from "@/components/dashboard/workspace-scope-tabs";

type PlayerTournamentsListPageProps = {
  roles: AppRole[];
};

type PlayerTournamentsViewScope = "created" | "history";

function placementTone(placement: string) {
  const lower = placement.toLowerCase();
  if (lower.includes("winner") || lower.includes("champion")) return "text-cp-primary";
  if (lower.includes("finalist") || lower.includes("runner")) return "text-amber-500 dark:text-amber-400";
  if (lower.includes("host")) return "text-sky-600 dark:text-sky-400";
  return "text-foreground";
}

function TournamentOrganizeRow({
  row,
  deletePending,
  onDelete,
}: {
  row: PlayerTournamentListItem;
  deletePending: boolean;
  onDelete: (tournamentId: string) => void;
}) {
  const href =
    row.sportSlug && row.slug
      ? publicSportRoutes.tournamentManage(row.sportSlug, row.slug)
      : row.tournamentId
        ? dashboardRoutes.tournament(row.tournamentId)
        : null;

  const resultLabel = formatPlayerTournamentResult(row);
  const schedule = formatTournamentListSchedule(row.startsAt, row.endsAt);
  const formatLabel = row.format ? getTournamentFormatLabel(row.format) : null;
  const billingLabel =
    row.source === "official" && row.officialBilling
      ? OFFICIAL_BILLING_LABELS[row.officialBilling]
      : null;

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TournamentTypeBadge tournamentType={row.source} />
          {row.status ? <TournamentStatusBadge status={row.status} /> : null}
          {billingLabel ? (
            <span className="rounded-full border border-cp-border bg-cp-elevated/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
              {billingLabel}
            </span>
          ) : null}
        </div>

        {href ? (
          <Link
            href={href}
            className="block truncate font-semibold text-foreground hover:text-cp-primary"
          >
            {row.tournamentName}
          </Link>
        ) : (
          <p className="truncate font-semibold text-foreground">{row.tournamentName}</p>
        )}

        <p className="text-xs text-cp-muted">
          {row.year}
          {row.category ? ` · ${row.category}` : ""}
          {formatLabel ? ` · ${formatLabel}` : ""}
          {row.venue ? ` · ${row.venue}` : ""}
        </p>

        {schedule ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-cp-text-dim">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {schedule}
          </p>
        ) : null}

        <p className={cn("text-sm font-semibold", placementTone(resultLabel))}>{resultLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {row.source === "fun_match" && row.tournamentId ? (
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link href={dashboardRoutes.tournament(row.tournamentId)}>
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
              Workspace
            </Link>
          </Button>
        ) : href ? (
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link href={href}>
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
              Manage
            </Link>
          </Button>
        ) : null}
        {row.canEdit && row.tournamentId ? (
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 text-cp-muted">
            <Link href={dashboardRoutes.tournamentEdit(row.tournamentId)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        {row.canDelete && row.tournamentId ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-red-500 hover:text-red-400"
            disabled={deletePending}
            title="Delete"
            onClick={() => onDelete(row.tournamentId!)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function PlayerTournamentsListPage({ roles }: PlayerTournamentsListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sportSlug, availableSports } = useDashboardSport();
  const sportName = availableSports.find((s) => s.slug === sportSlug)?.name ?? sportSlug;
  const scopeParam = searchParams.get("scope");
  const viewScope: PlayerTournamentsViewScope =
    scopeParam === "history" ? "history" : "created";

  const { confirm } = useConfirmDialog();
  const deleteTournament = useDeleteManageTournament();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [year, setYear] = useState<string>("all");
  const [type, setType] = useState<PlayerTournamentsListQuery["type"]>("all");
  const [status, setStatus] = useState<PlayerTournamentsListQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<PlayerTournamentsListQuery["sortBy"]>("year");
  const [sortDir, setSortDir] = useState<PlayerTournamentsListQuery["sortDir"]>("desc");

  useEffect(() => {
    setPage(1);
    setSearch("");
    setYear("all");
    setType("all");
    setStatus("all");
  }, [sportSlug, viewScope]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const queryParams: PlayerTournamentsListQuery = useMemo(
    () => ({
      page,
      pageSize,
      scope: "created",
      search: debouncedSearch || undefined,
      type,
      status,
      year: year === "all" ? undefined : Number(year),
      sortBy,
      sortDir,
    }),
    [page, pageSize, debouncedSearch, year, type, status, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error, refetch } = usePlayerTournamentsList(queryParams, {
    includeYears: true,
  });

  const yearOptions = data?.years ?? [];

  const scopeTabs = [
    {
      id: "created" as const,
      label: "Events I organize",
      shortLabel: "Organize",
      hint: "Official and Fun Match events you created",
      icon: Gamepad2,
    },
    {
      id: "history" as const,
      label: "Match history",
      shortLabel: "History",
      hint: "Matches you played with scores and career stats",
      icon: Swords,
    },
  ];

  const handleDeleteTournament = async (tournamentId: string) => {
    const ok = await confirm({
      title: "Delete tournament?",
      description:
        "This cannot be undone. Events with paid registrations or active brackets cannot be deleted.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (ok) deleteTournament.mutate(tournamentId);
  };

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title={viewScope === "created" ? "My events" : "Match history"}
      description={
        viewScope === "created"
          ? `${sportName} — manage events you organize, including Fun Match sessions and Official events you host.`
          : `${sportName} — every match you played with scores, opponents, and ranking context.`
      }
      breadcrumbs={[
        { label: "Player", href: dashboardRoutes.home },
        { label: "Tournaments" },
      ]}
      actions={
        viewScope === "created" ? (
          <Button
            asChild
            size="sm"
            className="h-10 w-full bg-cp-primary hover:bg-cp-primary-light md:w-auto"
          >
            <Link href={dashboardRoutes.tournamentsNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Fun Match
            </Link>
          </Button>
        ) : null
      }
    >
      <WorkspaceScopeTabs
        className="mb-4"
        variant="segmented"
        tabs={scopeTabs}
        active={viewScope}
        onChange={(id) => {
          router.push(`${dashboardRoutes.tournaments}?scope=${id}`);
        }}
      />

      <p className="mb-4 text-sm text-cp-muted">
        {viewScope === "created"
          ? "Search and filter events you created. Open Manage to run scoring, or Workspace for Fun Match lobbies."
          : "Filter your career match log by type, result, and year. Open a match for the full record."}
      </p>

      {viewScope === "history" ? (
        <PlayerMatchHistoryPanel />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
          <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5">
            <div className="relative min-w-0 w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, venue, format…"
                className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v as PlayerTournamentsListQuery["status"]);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All statuses
                  </SelectItem>
                  <SelectItem value="live" className={cpSelectItemClass}>
                    Live
                  </SelectItem>
                  <SelectItem value="upcoming" className={cpSelectItemClass}>
                    Upcoming
                  </SelectItem>
                  <SelectItem value="draft" className={cpSelectItemClass}>
                    Draft
                  </SelectItem>
                  <SelectItem value="completed" className={cpSelectItemClass}>
                    Completed
                  </SelectItem>
                  <SelectItem value="cancelled" className={cpSelectItemClass}>
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as PlayerTournamentsListQuery["type"]);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full")}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All types
                  </SelectItem>
                  <SelectItem value="official" className={cpSelectItemClass}>
                    Official
                  </SelectItem>
                  <SelectItem value="fun_match" className={cpSelectItemClass}>
                    Fun Match
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={year}
                onValueChange={(v) => {
                  setYear(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full")}>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All years
                  </SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)} className={cpSelectItemClass}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={`${sortBy}-${sortDir}`}
                onValueChange={(v) => {
                  const [sb, sd] = v.split("-") as [
                    PlayerTournamentsListQuery["sortBy"],
                    PlayerTournamentsListQuery["sortDir"],
                  ];
                  setSortBy(sb);
                  setSortDir(sd);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full")}>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="year-desc" className={cpSelectItemClass}>
                    Year (newest)
                  </SelectItem>
                  <SelectItem value="year-asc" className={cpSelectItemClass}>
                    Year (oldest)
                  </SelectItem>
                  <SelectItem value="status-asc" className={cpSelectItemClass}>
                    Status (live first)
                  </SelectItem>
                  <SelectItem value="tournament-asc" className={cpSelectItemClass}>
                    Name (A–Z)
                  </SelectItem>
                  <SelectItem value="tournament-desc" className={cpSelectItemClass}>
                    Name (Z–A)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

            {error ? (
              <div className="space-y-3 p-10 text-center">
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error instanceof Error ? error.message : "Failed to load events"}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            ) : isLoading ? (
              <CompetitionListSkeleton />
            ) : data?.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <Trophy className="h-10 w-10 text-cp-text-dim" />
                <p className="text-sm font-medium text-foreground">No events found</p>
                <p className="max-w-md text-xs text-cp-muted">
                  {search || year !== "all" || status !== "all" || type !== "all"
                    ? "Try adjusting search or filters."
                    : "Create a Fun Match to get started. Official events you host also appear here."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-cp-border">
                {data?.items.map((row) => (
                  <TournamentOrganizeRow
                    key={row.id}
                    row={row}
                    deletePending={deleteTournament.isPending}
                    onDelete={handleDeleteTournament}
                  />
                ))}
              </ul>
            )}
          </div>

          {data ? (
            <CompetitionListPagination
              page={data.page}
              pageSize={data.pageSize}
              totalPages={data.totalPages}
              total={data.total}
              disabled={isFetching}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          ) : null}
        </div>
      )}
    </DashboardWorkspaceShell>
  );
}
