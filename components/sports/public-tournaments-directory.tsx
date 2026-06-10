"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PublicTournamentsTable } from "@/components/sports/public-tournaments-table";
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
import { usePublicTournamentsList } from "@/hooks/use-public-tournaments";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { PublicTournamentsListQuery } from "@/lib/validations/tournaments";

type PublicTournamentsDirectoryProps = {
  sportSlug: string;
  sportName: string;
};

export function PublicTournamentsDirectory({
  sportSlug,
  sportName,
}: PublicTournamentsDirectoryProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState<PublicTournamentsListQuery["bucket"]>("all");
  const [type, setType] = useState<PublicTournamentsListQuery["type"]>("all");
  const [sortBy, setSortBy] = useState<PublicTournamentsListQuery["sortBy"]>("startsAt");
  const [sortDir, setSortDir] = useState<PublicTournamentsListQuery["sortDir"]>("desc");

  const queryParams = useMemo(
    (): PublicTournamentsListQuery => ({
      page,
      pageSize: 20,
      search: debouncedSearch || undefined,
      bucket,
      type,
      status: "all",
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, bucket, type, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = usePublicTournamentsList(
    sportSlug,
    queryParams,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={publicSportRoutes.sportHub(sportSlug)}
        className="text-sm text-cp-muted hover:text-foreground"
      >
        ← Back to {sportName}
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Tournaments</h1>
      <p className="mt-2 text-cp-muted">
        Official paid events and free reclub sessions for {sportName}.
      </p>

      <div className="mt-8 rounded-2xl border border-cp-border bg-cp-card">
        <div className="flex flex-col gap-3 border-b border-cp-border p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tournament, venue, category…"
              className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select
              value={bucket}
              onValueChange={(v) => {
                setBucket(v as PublicTournamentsListQuery["bucket"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as PublicTournamentsListQuery["type"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-cp-border bg-cp-elevated/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="official">Official</SelectItem>
                <SelectItem value="recreational">Reclub</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(v) => {
                const [sb, sd] = v.split("-") as [
                  PublicTournamentsListQuery["sortBy"],
                  PublicTournamentsListQuery["sortDir"],
                ];
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
            >
              <SelectTrigger className="col-span-2 h-10 border-cp-border bg-cp-elevated/50 sm:col-span-1">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startsAt-desc">Date (newest)</SelectItem>
                <SelectItem value="startsAt-asc">Date (oldest)</SelectItem>
                <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                <SelectItem value="updated-desc">Recently updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load tournaments"}
            </div>
          ) : isLoading ? (
            <CompetitionListSkeleton />
          ) : data?.items.length === 0 ? (
            <p className="py-16 text-center text-sm text-cp-muted">
              No tournaments match your filters.
            </p>
          ) : (
            <PublicTournamentsTable sportSlug={sportSlug} items={data?.items ?? []} />
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
