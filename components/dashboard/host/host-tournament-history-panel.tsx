"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Calendar,
  ChevronRight,
  ExternalLink,
  History,
  Loader2,
  Search,
  Trophy,
} from "lucide-react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import {
  TournamentStatusBadge,
  TournamentTypeBadge,
} from "@/components/dashboard/host/host-tournament-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useTournamentArchive,
} from "@/hooks/use-creator-tournament-history";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentsListQuery } from "@/lib/validations/tournaments";
import { cn } from "@/lib/utils";

export function HostTournamentHistoryPanel() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TournamentsListQuery["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<
    NonNullable<TournamentsListQuery["tournamentType"]>
  >("all");
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const query = useMemo(
    (): TournamentsListQuery => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      status,
      tournamentType: typeFilter,
      sortBy: "startsAt",
      sortDir: "desc",
    }),
    [page, debouncedSearch, status, typeFilter],
  );

  const { data, isLoading, isFetching, error } = useCreatorTournamentHistory(query);
  const { data: archive, isLoading: archiveLoading } = useTournamentArchive(archiveId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cp-border/80 bg-cp-elevated/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search events, venue…"
              className="h-10 border-cp-border bg-cp-card pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as TournamentsListQuery["status"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as NonNullable<TournamentsListQuery["tournamentType"]>);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-card">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="official">Official</SelectItem>
                <SelectItem value="fun_match">Fun Match</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

        {error ? (
          <p className="p-8 text-center text-sm text-red-400">
            {error instanceof Error ? error.message : "Failed to load history"}
          </p>
        ) : isLoading ? (
          <CompetitionListSkeleton />
        ) : !data?.items.length ? (
          <div className="py-16 text-center">
            <History className="mx-auto h-10 w-10 text-cp-muted" />
            <p className="mt-4 font-medium text-foreground">No tournament history yet</p>
            <p className="mt-1 text-sm text-cp-muted">
              Completed events and audit snapshots appear here for accountability.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cp-border">
            {data.items.map((item) => {
              const publicHref = publicSportRoutes.tournament(item.sportSlug, item.slug);
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TournamentTypeBadge tournamentType={item.tournamentType} />
                      <TournamentStatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 truncate font-semibold text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-xs text-cp-muted">
                      {item.sportName}
                      {item.categoryLabel ? ` · ${item.categoryLabel}` : ""}
                      {item.startsAt
                        ? ` · ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.startsAt))}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="h-9">
                      <Link href={`${publicHref}?manage=1`}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </Link>
                    </Button>
                    {item.status === "completed" || item.status === "cancelled" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-9"
                        onClick={() => setArchiveId(item.id)}
                      >
                        <Archive className="mr-1.5 h-3.5 w-3.5" />
                        Audit snapshot
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {data ? (
          <CompetitionListPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            disabled={isFetching}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Dialog open={Boolean(archiveId)} onOpenChange={(open) => !open && setArchiveId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-cp-border bg-cp-card">
          <DialogHeader>
            <DialogTitle>Tournament audit snapshot</DialogTitle>
          </DialogHeader>
          {archiveLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-cp-primary" />
            </div>
          ) : archive ? (
            <div className="space-y-4 text-sm">
              <p className="text-cp-muted">
                Archived {new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(archive.archivedAt))}
                {" · "}
                Stats tier: <span className="font-medium text-foreground">{archive.statsTier}</span>
              </p>
              <pre className="max-h-[50vh] overflow-auto rounded-xl border border-cp-border bg-cp-elevated/50 p-4 text-xs text-cp-muted">
                {JSON.stringify(archive.snapshot, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-cp-muted">
              No archive snapshot yet. Snapshots are created when a tournament completes or is
              cancelled.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
