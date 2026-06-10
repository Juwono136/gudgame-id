"use client";

import { useMemo, useState } from "react";
import { Search, Swords } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
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
import { usePlayerMatchesList } from "@/hooks/use-player-competition";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PlayerMatchesListQuery } from "@/lib/validations/player-competition";
import { cn } from "@/lib/utils";

type PlayerMatchesListPageProps = {
  roles: AppRole[];
};

function formatPlayedAt(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function PlayerMatchesListPage({ roles }: PlayerMatchesListPageProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PlayerMatchesListQuery["result"]>("all");
  const [year, setYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<PlayerMatchesListQuery["sortBy"]>("playedAt");
  const [sortDir, setSortDir] = useState<PlayerMatchesListQuery["sortDir"]>("desc");

  const queryParams: PlayerMatchesListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      result,
      year: year === "all" ? undefined : Number(year),
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, result, year, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = usePlayerMatchesList(queryParams, {
    includeYears: true,
  });

  const yearOptions = data?.years ?? [];

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Match log"
      description="Complete record of your tournament matches on TandingBase."
      breadcrumbs={[
        { label: "Overview", href: dashboardRoutes.home },
        { label: "Match log" },
      ]}
    >
      <div className="rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tournament or opponents…"
              className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            <Select
              value={result}
              onValueChange={(v) => {
                setResult(v as PlayerMatchesListQuery["result"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
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
                  PlayerMatchesListQuery["sortBy"],
                  PlayerMatchesListQuery["sortDir"],
                ];
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
            >
              <SelectTrigger className="col-span-2 h-10 border-cp-border bg-cp-elevated/50 sm:col-span-2">
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
                {search || result !== "all" || year !== "all"
                  ? "Try adjusting your search or filters."
                  : "Match history will appear here after you compete in tournaments on TandingBase."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden border-b border-cp-border bg-cp-elevated/50 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:grid sm:grid-cols-[1.2fr_1fr_100px_120px] sm:gap-3 sm:text-xs">
                <span>Tournament</span>
                <span>Opponents</span>
                <span>Date</span>
                <span className="text-right">Result</span>
              </div>

              <ul className="divide-y divide-cp-border">
                {data?.items.map((match) => (
                  <li
                    key={match.id}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[1.2fr_1fr_100px_120px] sm:items-center sm:gap-3 sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {match.tournamentName}
                      </p>
                      {match.round ? (
                        <p className="text-xs text-cp-muted">{match.round}</p>
                      ) : null}
                    </div>
                    <p className="text-sm text-cp-muted">{match.opponents}</p>
                    <p className="text-xs text-cp-muted sm:text-sm">
                      {formatPlayedAt(match.playedAt)}
                    </p>
                    <div className="sm:text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          match.resultType === "win"
                            ? "bg-cp-primary/15 text-cp-primary"
                            : "bg-red-500/15 text-red-400",
                        )}
                      >
                        {match.score ?? (match.resultType === "win" ? "Win" : "Loss")}
                      </span>
                    </div>
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
    </DashboardWorkspaceShell>
  );
}
