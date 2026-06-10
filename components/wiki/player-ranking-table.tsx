"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, User } from "lucide-react";
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
import { publicSportRoutes } from "@/lib/constants/routes";
import type { PublicPlayersListQuery } from "@/lib/validations/public-wiki";
import { cn } from "@/lib/utils";

type PlayerRankingTableProps = {
  sportSlug: string;
  sportName: string;
};

function formatPoints(points: number | null): string {
  if (points == null) return "—";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(points);
}

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
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Players</h1>
        <p className="mt-2 text-cp-muted">
          Find the best {sportName.toLowerCase()} players — rankings, points, and profiles.
        </p>
      </header>

      <div className="rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search player name…"
              className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
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
            <SelectTrigger className="h-10 w-full border-cp-border bg-cp-elevated/50 sm:w-48">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points-desc">Points (highest)</SelectItem>
              <SelectItem value="points-asc">Points (lowest)</SelectItem>
              <SelectItem value="name-asc">Name (A–Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z–A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative overflow-x-auto">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load players"}
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : data?.items.length === 0 ? (
            <p className="py-16 text-center text-sm text-cp-muted">No players found.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-cp-border bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
                  <th className="px-4 py-3 sm:px-6">Rank</th>
                  <th className="px-4 py-3 sm:px-6">Name</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-6">Province</th>
                  <th className="hidden px-4 py-3 md:table-cell sm:px-6">Tier</th>
                  <th className="px-4 py-3 text-right sm:px-6">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cp-border">
                {data?.items.map((player) => (
                  <tr
                    key={player.slug}
                    className="transition-colors hover:bg-cp-elevated/30"
                  >
                    <td className="px-4 py-3 font-semibold text-foreground sm:px-6">
                      {player.rank}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <Link
                        href={publicSportRoutes.player(sportSlug, player.slug)}
                        className="group inline-flex min-w-0 items-center gap-3"
                      >
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-cp-border bg-cp-elevated">
                          {player.avatarUrl ? (
                            <Image
                              src={player.avatarUrl}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-cp-muted">
                              <User className="h-5 w-5" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground group-hover:text-cp-primary">
                            {player.displayName}
                          </span>
                          {player.playingStyle ? (
                            <span className="block truncate text-xs text-cp-muted">
                              {player.playingStyle}
                            </span>
                          ) : player.nickname ? (
                            <span className="block text-xs text-cp-muted">{player.nickname}</span>
                          ) : null}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-cp-muted sm:table-cell sm:px-6">
                      {player.province ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 sm:px-6 md:table-cell">
                      {player.tier ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            player.tier === "pro"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-cp-primary/15 text-cp-primary",
                          )}
                        >
                          {player.tier}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground sm:px-6">
                      {formatPoints(player.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
