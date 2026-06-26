"use client";

import { useMemo, useState } from "react";
import { Search, Swords } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import { PlayerMatchDetailDialog } from "@/components/dashboard/player/competition/player-match-detail-dialog";
import {
  MATCH_LIST_GRID,
  PlayerMatchListRow,
} from "@/components/dashboard/player/competition/player-match-list-row";
import {
  PlayerMatchesSummaryCards,
  PlayerMatchesSummaryHint,
} from "@/components/dashboard/player/competition/player-matches-summary-cards";
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
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PlayerMatchesListQuery } from "@/lib/validations/player-competition";
import { cn } from "@/lib/utils";

type PlayerMatchesListPageProps = {
  roles: AppRole[];
};

export function PlayerMatchesListPage({ roles }: PlayerMatchesListPageProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PlayerMatchesListQuery["result"]>("all");
  const [type, setType] = useState<PlayerMatchesListQuery["type"]>("all");
  const [year, setYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<PlayerMatchesListQuery["sortBy"]>("playedAt");
  const [sortDir, setSortDir] = useState<PlayerMatchesListQuery["sortDir"]>("desc");
  const [detailMatchId, setDetailMatchId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const queryParams: PlayerMatchesListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      result,
      type,
      year: year === "all" ? undefined : Number(year),
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, result, type, year, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = usePlayerMatchesList(queryParams, {
    includeYears: true,
    includeSummary: true,
  });

  const yearOptions = data?.years ?? [];

  const openDetails = (matchId: number) => {
    setDetailMatchId(matchId);
    setDetailOpen(true);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) || result !== "all" || type !== "all" || year !== "all";

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Match log"
      description="Official and Fun Match tournament matches you have played — with full results and context."
      breadcrumbs={[
        { label: "Overview", href: dashboardRoutes.home },
        { label: "Match log" },
      ]}
    >
      <div className="mb-4 space-y-3 sm:mb-5">
        <PlayerMatchesSummaryCards summary={data?.summary} isLoading={isLoading} />
        <PlayerMatchesSummaryHint />
      </div>

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5">
          <div className="relative min-w-0 w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tournaments, opponents, rounds…"
              className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as PlayerMatchesListQuery["type"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="official">Official</SelectItem>
                <SelectItem value="recreational">Reclub</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={result}
              onValueChange={(v) => {
                setResult(v as PlayerMatchesListQuery["result"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={year}
              onValueChange={(v) => {
                setYear(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50">
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
                  PlayerMatchesListQuery["sortBy"],
                  PlayerMatchesListQuery["sortDir"],
                ];
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-0 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="playedAt-desc">Date (newest)</SelectItem>
                <SelectItem value="playedAt-asc">Date (oldest)</SelectItem>
                <SelectItem value="tournament-asc">Tournament (A–Z)</SelectItem>
                <SelectItem value="tournament-desc">Tournament (Z–A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative overflow-hidden">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load matches"}
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <Swords className="h-10 w-10 text-cp-text-dim" />
              <p className="text-sm font-medium text-foreground">No matches found</p>
              <p className="max-w-md text-xs text-cp-muted">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Match history from official and Fun Match tournaments will appear here after you compete."}
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "hidden border-b border-cp-border bg-cp-elevated/50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-cp-muted",
                  MATCH_LIST_GRID,
                )}
              >
                <span>Tournament</span>
                <span>Type</span>
                <span>Sport</span>
                <span>Opponents</span>
                <span>Date</span>
                <span>Result</span>
                <span className="text-right"> </span>
              </div>

              <ul className="divide-y divide-cp-border">
                {data?.items.map((match) => (
                  <PlayerMatchListRow
                    key={match.id}
                    match={match}
                    onViewDetails={openDetails}
                  />
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

      <PlayerMatchDetailDialog
        matchId={detailMatchId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailMatchId(null);
        }}
      />
    </DashboardWorkspaceShell>
  );
}
