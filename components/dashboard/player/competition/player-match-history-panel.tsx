"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Swords } from "lucide-react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import {
  MATCH_LIST_GRID,
  PlayerMatchListRow,
} from "@/components/dashboard/player/competition/player-match-list-row";
import {
  PlayerMatchesSummaryCards,
  PlayerMatchesSummaryHint,
} from "@/components/dashboard/player/competition/player-matches-summary-cards";
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
import { usePlayerMatchesList } from "@/hooks/use-player-competition";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import type { PlayerMatchesListQuery } from "@/lib/validations/player-competition";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

export function PlayerMatchHistoryPanel() {
  const { sportSlug } = useDashboardSport();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState<PlayerMatchesListQuery["result"]>("all");
  const [type, setType] = useState<PlayerMatchesListQuery["type"]>("all");
  const [year, setYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<PlayerMatchesListQuery["sortBy"]>("playedAt");
  const [sortDir, setSortDir] = useState<PlayerMatchesListQuery["sortDir"]>("desc");

  useEffect(() => {
    setPage(1);
    setSearch("");
    setResult("all");
    setType("all");
    setYear("all");
  }, [sportSlug]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const queryParams: PlayerMatchesListQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      result,
      type,
      year: year === "all" ? undefined : Number(year),
      sortBy,
      sortDir,
    }),
    [page, pageSize, debouncedSearch, result, type, year, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error, refetch } = usePlayerMatchesList(queryParams, {
    includeYears: true,
    includeSummary: true,
  });

  const yearOptions = data?.years ?? [];
  const hasFilters =
    Boolean(search) || result !== "all" || type !== "all" || year !== "all";

  return (
    <div className="space-y-4">
      {data?.summary ? <PlayerMatchesSummaryCards summary={data.summary} /> : null}
      <PlayerMatchesSummaryHint />

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="border-b border-cp-border p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tournaments, opponents, rounds…"
                className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as PlayerMatchesListQuery["type"]);
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
                value={result}
                onValueChange={(v) => {
                  setResult(v as PlayerMatchesListQuery["result"]);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full")}>
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All results
                  </SelectItem>
                  <SelectItem value="win" className={cpSelectItemClass}>
                    Wins
                  </SelectItem>
                  <SelectItem value="loss" className={cpSelectItemClass}>
                    Losses
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
                    PlayerMatchesListQuery["sortBy"],
                    PlayerMatchesListQuery["sortDir"],
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
                  <SelectItem value="playedAt-desc" className={cpSelectItemClass}>
                    Date (newest)
                  </SelectItem>
                  <SelectItem value="playedAt-asc" className={cpSelectItemClass}>
                    Date (oldest)
                  </SelectItem>
                  <SelectItem value="tournament-asc" className={cpSelectItemClass}>
                    Tournament (A–Z)
                  </SelectItem>
                  <SelectItem value="tournament-desc" className={cpSelectItemClass}>
                    Tournament (Z–A)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="relative">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="space-y-3 p-10 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load matches"}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : !data?.items.length ? (
            <div className="py-16 text-center">
              <Swords className="mx-auto h-10 w-10 text-cp-muted" />
              <p className="mt-4 font-medium text-foreground">No matches yet</p>
              <p className="mt-1 px-4 text-sm text-cp-muted">
                {hasFilters
                  ? "Try adjusting search or filters."
                  : "Join a Fun Match or register for an Official event — results appear here after matches are recorded."}
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "hidden border-b border-cp-border bg-cp-elevated/40 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted lg:grid",
                  MATCH_LIST_GRID,
                )}
              >
                <span>Tournament</span>
                <span>Type</span>
                <span>Sport</span>
                <span>Opponents</span>
                <span>Date</span>
                <span>Result</span>
                <span className="text-right">Action</span>
              </div>
              <ul className="divide-y divide-cp-border">
                {data.items.map((match) => (
                  <PlayerMatchListRow key={match.id} match={match} />
                ))}
              </ul>
            </>
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
    </div>
  );
}
