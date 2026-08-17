"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Calendar,
  ExternalLink,
  History,
  Search,
  Trophy,
} from "lucide-react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import { HostTournamentAuditDialog } from "@/components/dashboard/host/host-tournament-audit-dialog";
import {
  HostTournamentIconActions,
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
import { useDebounce } from "@/hooks/use-debounce";
import {
  useCreatorTournamentHistory,
  type CreatorTournamentHistoryItem,
} from "@/hooks/use-creator-tournament-history";
import { useDeleteHostTournament } from "@/hooks/use-host-tournaments";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { formatTournamentListSchedule } from "@/lib/tournaments/format-schedule";
import type { CreatorTournamentScope } from "@/lib/tournaments/archives/service";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";
import { toast } from "sonner";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type HostTournamentsScopedListProps = {
  scope: CreatorTournamentScope;
  className?: string;
  onCounts?: (counts: {
    total: number;
    live: number;
    upcoming: number;
    completed: number;
  }) => void;
};

const ACTIVE_STATUS_OPTIONS = [
  { value: "all", label: "All active" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "draft", label: "Draft" },
] as const;

const HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "All history" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function manageHref(item: CreatorTournamentHistoryItem) {
  if (item.sportSlug && item.slug) {
    return publicSportRoutes.tournamentManage(item.sportSlug, item.slug);
  }
  return dashboardRoutes.hostTournament(item.id);
}

export function HostTournamentsScopedList({
  scope,
  className,
  onCounts,
}: HostTournamentsScopedListProps) {
  const { confirm } = useConfirmDialog();
  const { sportSlug, availableSports } = useDashboardSport();
  const sportName = availableSports.find((s) => s.slug === sportSlug)?.name ?? sportSlug;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<TournamentsListQuery["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<
    NonNullable<TournamentsListQuery["tournamentType"]>
  >("all");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState<string | undefined>();

  const deleteTournament = useDeleteHostTournament();

  useEffect(() => {
    setPage(1);
    setSearch("");
    setStatus("all");
    setTypeFilter("all");
  }, [scope, sportSlug]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const query = useMemo(
    (): TournamentsListQuery => ({
      page,
      pageSize,
      search: debouncedSearch.trim() || undefined,
      status,
      tournamentType: typeFilter,
      sortBy: "startsAt",
      sortDir: "desc",
    }),
    [page, pageSize, debouncedSearch, status, typeFilter],
  );

  const { data, isLoading, isFetching, error } = useCreatorTournamentHistory(query, scope);

  useEffect(() => {
    if (!data?.counts || !onCounts) return;
    onCounts({
      total: data.counts.total,
      live: data.counts.live,
      upcoming: data.counts.upcoming,
      completed: data.counts.completed,
    });
  }, [data?.counts, onCounts]);

  const statusOptions = scope === "active" ? ACTIVE_STATUS_OPTIONS : HISTORY_STATUS_OPTIONS;
  const isEditableStatus = (s: string) => s !== "completed" && s !== "cancelled";

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description:
        "This cannot be undone. Tournaments with paid registrations or active brackets cannot be deleted.",
      confirmLabel: "Delete tournament",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    deleteTournament.mutate(id);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <LoadingOverlay show={deleteTournament.isPending} label="Deleting tournament…" />

      <div className="rounded-2xl border border-cp-border/80 bg-cp-elevated/20 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, venue…"
              className="h-10 border-cp-border bg-cp-card pl-9"
              aria-label="Search tournaments"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as TournamentsListQuery["status"]);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:w-[10.5rem]")}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={cpSelectItemClass}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as NonNullable<TournamentsListQuery["tournamentType"]>);
                setPage(1);
              }}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:w-[9.5rem]")}>
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
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

        {error ? (
          <p className="p-8 text-center text-sm text-red-400">
            {error instanceof Error ? error.message : "Failed to load tournaments"}
          </p>
        ) : isLoading ? (
          <CompetitionListSkeleton />
        ) : !data?.items.length ? (
          <div className="py-16 text-center">
            {scope === "active" ? (
              <Trophy className="mx-auto h-10 w-10 text-cp-muted" />
            ) : (
              <History className="mx-auto h-10 w-10 text-cp-muted" />
            )}
            <p className="mt-4 font-medium text-foreground">
              {scope === "active" ? "No active events" : `No ${sportName} history yet`}
            </p>
            <p className="mt-1 px-4 text-sm text-cp-muted">
              {scope === "active"
                ? "Upcoming and live tournaments appear here. Try clearing search or filters."
                : "Completed and cancelled events appear here with a locked final record."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cp-border">
            {data.items.map((item) => {
              const href = manageHref(item);
              const publicHref = publicSportRoutes.tournament(item.sportSlug, item.slug);
              const isHistoryItem =
                item.status === "completed" || item.status === "cancelled";

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TournamentTypeBadge tournamentType={item.tournamentType} />
                      <TournamentStatusBadge status={item.status} />
                    </div>
                    <Link
                      href={isHistoryItem ? publicHref : href}
                      className="mt-2 block truncate font-semibold text-foreground hover:text-cp-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-cp-muted">
                      {item.sportName}
                      {item.categoryLabel ? ` · ${item.categoryLabel}` : ""}
                      {item.venue ? ` · ${item.venue}` : ""}
                    </p>
                    {formatTournamentListSchedule(item.startsAt, item.endsAt) ? (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-cp-text-dim">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatTournamentListSchedule(item.startsAt, item.endsAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {scope === "active" ? (
                      <HostTournamentIconActions
                        tournamentId={item.id}
                        sportSlug={item.sportSlug}
                        slug={item.slug}
                        canEdit={isEditableStatus(item.status)}
                        onEditDisabled={() =>
                          toast.error("This tournament can't be edited", {
                            description: "Completed or cancelled tournaments are locked for edits.",
                          })
                        }
                        onDelete={() => void handleDelete(item.id, item.name)}
                        showWorkspaceLink
                      />
                    ) : (
                      <>
                        <Button asChild size="sm" variant="outline" className="h-9">
                          <Link href={publicHref}>
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Open
                          </Link>
                        </Button>
                        {isHistoryItem ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-9"
                            onClick={() => {
                              setArchiveId(item.id);
                              setArchiveName(item.name);
                            }}
                          >
                            <Archive className="mr-1.5 h-3.5 w-3.5" />
                            Final record
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

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

      <HostTournamentAuditDialog
        tournamentId={archiveId}
        tournamentName={archiveName}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveId(null);
            setArchiveName(undefined);
          }
        }}
      />
    </div>
  );
}
