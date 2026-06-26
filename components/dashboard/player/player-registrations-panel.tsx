"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, RefreshCw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePlayerRegistrations } from "@/hooks/use-player-payments";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  DEFAULT_PAGE_SIZE,
  toTotalPages,
} from "@/lib/pagination/constants";
import type { PlayerRegistrationItem } from "@/lib/tournaments/payments/player-history";
import { getTournamentTypeBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

const REG_FILTERS = ["all", "upcoming", "live", "completed"] as const;
type RegFilter = (typeof REG_FILTERS)[number];

const FILTER_LABELS: Record<RegFilter, string> = {
  all: "All",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
};

function matchesPhase(item: PlayerRegistrationItem, filter: RegFilter): boolean {
  if (filter === "all") return true;
  const now = Date.now();
  const start = item.startsAt ? new Date(item.startsAt).getTime() : null;
  const end = item.endsAt ? new Date(item.endsAt).getTime() : null;
  if (filter === "upcoming") return start != null && start > now;
  if (filter === "live") return start != null && start <= now && (end == null || end >= now);
  if (filter === "completed") return end != null && end < now;
  return true;
}

function formatTournamentDates(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return "Dates TBA";
  const start = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(startsAt));
  if (!endsAt) return start;
  const end = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(endsAt));
  return `${start} – ${end}`;
}

function RegistrationCard({ item }: { item: PlayerRegistrationItem }) {
  const isOfficial = item.tournamentType === "official";
  const needsPayment =
    isOfficial && item.status === "pending_payment" && item.paymentStatus !== "paid";

  return (
    <li className="flex min-w-0 flex-col rounded-2xl border border-cp-border bg-cp-card/70 p-4 transition-colors hover:border-cp-primary/30 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("border-0", getTournamentTypeBadgeClass(isOfficial ? "official" : "recreational"))}>
          {isOfficial ? "Official" : "Reclub"}
        </Badge>
        <Badge variant="muted" className="capitalize">
          {item.status.replace(/_/g, " ")}
        </Badge>
        {needsPayment ? (
          <Badge variant="warning" className="border-0">Payment due</Badge>
        ) : null}
      </div>

      <p className="mt-3 font-semibold leading-snug text-foreground">{item.tournamentName}</p>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-cp-muted">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {formatTournamentDates(item.startsAt, item.endsAt)}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:items-start">
        <Button asChild size="sm" variant="outline" className="h-9 border-cp-border">
          <Link href={publicSportRoutes.tournament(item.sportSlug, item.tournamentSlug)}>
            View tournament
          </Link>
        </Button>
        {needsPayment ? (
          <Button asChild size="sm" className="h-9 bg-cp-primary">
            <Link
              href={`/sports/${item.sportSlug}/tournaments/${item.tournamentSlug}/register/checkout?registrationId=${item.registrationId}`}
            >
              Complete payment
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function PlayerRegistrationsPanel() {
  const [filter, setFilter] = useState<RegFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, isError, error, refetch, isFetching } = usePlayerRegistrations();

  const filtered = useMemo(
    () => (data ?? []).filter((item) => matchesPhase(item, filter)),
    [data, filter],
  );

  const totalPages = toTotalPages(filtered.length, pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
      <div className="flex flex-col gap-4 border-b border-cp-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tournament registrations</h3>
          <p className="mt-1 text-xs text-cp-muted">
            Official events and Fun Match sessions you have joined or registered for.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-cp-border bg-cp-elevated/30 p-1 sm:w-auto sm:grid-cols-4">
          {REG_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "h-9 rounded-lg px-2 text-xs font-medium transition-colors sm:px-3",
                filter === f
                  ? "bg-cp-primary/15 text-cp-primary shadow-sm"
                  : "text-cp-muted hover:text-foreground",
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center px-4 py-16">
          <LoadingSpinner label="Loading registrations…" />
        </div>
      ) : isError ? (
        <div className="px-4 py-16 text-center sm:px-5">
          <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
          <p className="mt-3 text-sm font-medium text-foreground">Could not load registrations</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-red-200/90">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-4 border-cp-border"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-16 text-center sm:px-5">
          <Trophy className="mx-auto h-10 w-10 text-cp-text-dim" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {filter === "all" ? "No registrations yet" : `No ${filter} registrations`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-cp-muted">
            {filter === "all"
              ? "Join an official tournament or Fun Match — it will appear here."
              : "Try another filter or browse upcoming events on the tournaments page."}
          </p>
        </div>
      ) : (
        <>
          <ul
            className={cn(
              "grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3",
              isFetching && "opacity-60",
            )}
          >
            {pageItems.map((item) => (
              <RegistrationCard key={item.tournamentId} item={item} />
            ))}
          </ul>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            totalPages={totalPages}
            disabled={isFetching}
            onPageChange={setPage}
            onPageSizeChange={(size) => setPageSize(size)}
          />
        </>
      )}
    </div>
  );
}
