"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Trophy } from "lucide-react";
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
import { usePlayerTournamentsList } from "@/hooks/use-player-competition";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { PlayerTournamentsListQuery } from "@/lib/validations/player-competition";
import { cn } from "@/lib/utils";

function placementTone(placement: string) {
  const lower = placement.toLowerCase();
  if (lower.includes("winner") || lower.includes("champion")) {
    return "text-cp-primary";
  }
  if (lower.includes("finalist") || lower.includes("runner")) {
    return "text-amber-400";
  }
  return "text-foreground";
}

export function PlayerTournamentsListPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [year, setYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<PlayerTournamentsListQuery["sortBy"]>("year");
  const [sortDir, setSortDir] = useState<PlayerTournamentsListQuery["sortDir"]>("desc");

  const queryParams: PlayerTournamentsListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      year: year === "all" ? undefined : Number(year),
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, year, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = usePlayerTournamentsList(queryParams, {
    includeYears: true,
  });

  const yearOptions = data?.years ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <Link
        href={dashboardRoutes.home}
        className="inline-flex items-center gap-1.5 text-sm text-cp-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">
          Tournament history
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          All tournaments
        </h1>
        <p className="mt-1 text-sm text-cp-muted">
          Season-by-season placements from official TandingBase events.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tournament, category, or placement…"
              className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2">
            <Select
              value={year}
              onValueChange={(v) => {
                setYear(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
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
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year-desc">Year (newest)</SelectItem>
                <SelectItem value="year-asc">Year (oldest)</SelectItem>
                <SelectItem value="tournament-asc">Tournament (A–Z)</SelectItem>
                <SelectItem value="tournament-desc">Tournament (Z–A)</SelectItem>
                <SelectItem value="placement-asc">Placement (best)</SelectItem>
                <SelectItem value="placement-desc">Placement (worst)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative overflow-hidden">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load tournaments"}
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <Trophy className="h-10 w-10 text-cp-text-dim" />
              <p className="text-sm font-medium text-foreground">No tournaments found</p>
              <p className="max-w-md text-xs text-cp-muted">
                {search || year !== "all"
                  ? "Try adjusting your search or filters."
                  : "Tournament placements will appear here once you compete in recorded events."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden border-b border-cp-border bg-cp-elevated/50 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:grid sm:grid-cols-[80px_1.2fr_1fr_120px] sm:gap-3 sm:text-xs">
                <span>Year</span>
                <span>Tournament</span>
                <span>Category</span>
                <span className="text-right">Placement</span>
              </div>

              <ul className="divide-y divide-cp-border">
                {data?.items.map((row) => (
                  <li
                    key={row.id}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[80px_1.2fr_1fr_120px] sm:items-center sm:gap-3 sm:px-6"
                  >
                    <p className="text-sm font-semibold text-foreground">{row.year}</p>
                    <p className="text-sm font-medium text-foreground">{row.tournamentName}</p>
                    <p className="text-sm text-cp-muted">{row.category ?? "—"}</p>
                    <p
                      className={cn(
                        "text-sm font-semibold sm:text-right",
                        placementTone(row.placement),
                      )}
                    >
                      {row.placement}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

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
    </div>
  );
}
