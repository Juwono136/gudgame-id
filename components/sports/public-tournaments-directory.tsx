"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { TournamentFilterMenu } from "@/components/sports/tournament-filter-menu";
import { TournamentDiscoveryPublicCard } from "@/components/tournaments/tournament-discovery-public-card";
import { Input } from "@/components/ui/input";
import { StatusFilterPills } from "@/components/ui/status-filter-pills";
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

const STATUS_PILLS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Completed" },
] as const;

export function PublicTournamentsDirectory({
  sportSlug,
  sportName,
}: PublicTournamentsDirectoryProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState<PublicTournamentsListQuery["bucket"]>("all");
  const [type, setType] = useState<PublicTournamentsListQuery["type"]>("all");
  const [officialBilling, setOfficialBilling] = useState<
    NonNullable<PublicTournamentsListQuery["officialBilling"]>
  >("all");
  const [format, setFormat] = useState<NonNullable<PublicTournamentsListQuery["format"]>>("all");
  const [category, setCategory] = useState<NonNullable<PublicTournamentsListQuery["category"]>>(
    "all",
  );
  const [sortBy, setSortBy] = useState<PublicTournamentsListQuery["sortBy"]>("startsAt");
  const [sortDir, setSortDir] = useState<PublicTournamentsListQuery["sortDir"]>("desc");

  const queryParams = useMemo(
    (): PublicTournamentsListQuery => ({
      page,
      pageSize: 12,
      search: debouncedSearch || undefined,
      bucket,
      type,
      officialBilling,
      format,
      category,
      status: "all",
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, bucket, type, officialBilling, format, category, sortBy, sortDir],
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
        Official paid events and free Fun Match sessions for {sportName}.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border border-cp-border bg-cp-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search cups…"
                className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-9 text-foreground sm:h-11"
                aria-label="Search tournaments"
              />
            </div>
            <TournamentFilterMenu
              value={{ bucket, type, officialBilling, format, category, sortBy, sortDir }}
              onChange={(next) => {
                setBucket(next.bucket);
                setType(next.type);
                setOfficialBilling(next.officialBilling);
                setFormat(next.format);
                setCategory(next.category);
                setSortBy(next.sortBy);
                setSortDir(next.sortDir);
                setPage(1);
              }}
            />
          </div>

          <StatusFilterPills
            className="mt-3"
            value={bucket}
            ariaLabel="Filter by tournament status"
            options={[...STATUS_PILLS]}
            onChange={(v) => {
              setBucket(v as PublicTournamentsListQuery["bucket"]);
              setPage(1);
            }}
          />
        </div>

        <div className="relative min-h-[12rem]">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="rounded-2xl border border-cp-border bg-cp-card p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load tournaments"}
            </div>
          ) : isLoading ? (
            <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
              <CompetitionListSkeleton />
            </div>
          ) : data?.items.length === 0 ? (
            <p className="rounded-2xl border border-cp-border bg-cp-card py-16 text-center text-sm text-cp-muted">
              No tournaments match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {(data?.items ?? []).map((tournament) => (
                <TournamentDiscoveryPublicCard
                  key={tournament.id}
                  tournament={tournament}
                  detailHref={publicSportRoutes.tournament(sportSlug, tournament.slug)}
                  registerHref={publicSportRoutes.tournamentRegister(
                    sportSlug,
                    tournament.slug,
                  )}
                />
              ))}
            </div>
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
