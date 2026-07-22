"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { PublicPlayersList } from "@/components/wiki/public-players-list";
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
import { usePublicPlayersList } from "@/hooks/use-public-players";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import type { PublicPlayersListQuery } from "@/lib/validations/public-wiki";
import { cn } from "@/lib/utils";

type PlayerRankingTableProps = {
  sportSlug: string;
  sportName: string;
};

export function PlayerRankingTable({ sportSlug, sportName }: PlayerRankingTableProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<PublicPlayersListQuery["sortBy"]>("points");
  const [sortDir, setSortDir] = useState<PublicPlayersListQuery["sortDir"]>("desc");

  const queryParams = useMemo(
    (): PublicPlayersListQuery => ({
      page,
      pageSize: 20,
      search: debouncedSearch || undefined,
      sortBy,
      sortDir,
      gender: "all",
    }),
    [page, debouncedSearch, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = usePublicPlayersList(sportSlug, queryParams);

  return (
    <div>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Players</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cp-muted sm:text-base">
          All published {sportName.toLowerCase()} player profiles — rankings, tiers, and career
          stats from official tournament results.
        </p>
        {data ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-cp-border bg-cp-elevated/40 px-3 py-1 text-xs font-medium text-cp-muted">
            <Users className="h-3.5 w-3.5" />
            {data.total} player{data.total === 1 ? "" : "s"} in {sportName}
          </p>
        ) : null}
      </header>

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="border-b border-cp-border p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search player name, nickname, or bio…"
                className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-9 text-foreground sm:h-11"
              />
            </div>
            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(v) => {
                const [sb, sd] = v.split("-") as [
                  PublicPlayersListQuery["sortBy"],
                  PublicPlayersListQuery["sortDir"],
                ];
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
            >
              <SelectTrigger
                className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11 lg:w-[200px] lg:shrink-0")}
              >
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                <SelectItem value="points-desc" className={cpSelectItemClass}>
                  Career points (highest)
                </SelectItem>
                <SelectItem value="points-asc" className={cpSelectItemClass}>
                  Career points (lowest)
                </SelectItem>
                <SelectItem value="rank-asc" className={cpSelectItemClass}>
                  Rank (best first)
                </SelectItem>
                <SelectItem value="name-asc" className={cpSelectItemClass}>
                  Name (A–Z)
                </SelectItem>
                <SelectItem value="name-desc" className={cpSelectItemClass}>
                  Name (Z–A)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load players"}
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <Users className="h-10 w-10 text-cp-muted" />
              <p className="text-sm text-cp-muted">
                {debouncedSearch
                  ? "No players match your search."
                  : `No published player profiles for ${sportName} yet.`}
              </p>
            </div>
          ) : (
            <PublicPlayersList sportSlug={sportSlug} items={data?.items ?? []} />
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
