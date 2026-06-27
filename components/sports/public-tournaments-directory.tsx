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
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/ui/labels";
import type { PublicTournamentsListQuery } from "@/lib/validations/tournaments";
import { cn } from "@/lib/utils";

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
      pageSize: 20,
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

      <div className="mt-8 overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
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
                placeholder="Search tournament, venue, category…"
                className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-9 text-foreground sm:h-11"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:shrink-0 lg:grid-cols-3 xl:grid-cols-6">
              <Select
                value={bucket}
                onValueChange={(v) => {
                  setBucket(v as PublicTournamentsListQuery["bucket"]);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All statuses
                  </SelectItem>
                  <SelectItem value="live" className={cpSelectItemClass}>
                    Live
                  </SelectItem>
                  <SelectItem value="upcoming" className={cpSelectItemClass}>
                    Upcoming
                  </SelectItem>
                  <SelectItem value="past" className={cpSelectItemClass}>
                    Past
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as PublicTournamentsListQuery["type"]);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
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
                value={officialBilling}
                onValueChange={(v) => {
                  setOfficialBilling(v as NonNullable<PublicTournamentsListQuery["officialBilling"]>);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                  <SelectValue placeholder="Billing" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All billing
                  </SelectItem>
                  <SelectItem value="paid" className={cpSelectItemClass}>
                    {OFFICIAL_BILLING_LABELS.paid}
                  </SelectItem>
                  <SelectItem value="free" className={cpSelectItemClass}>
                    {OFFICIAL_BILLING_LABELS.free}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={format}
                onValueChange={(v) => {
                  setFormat(v as NonNullable<PublicTournamentsListQuery["format"]>);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All formats
                  </SelectItem>
                  <SelectItem value="americano" className={cpSelectItemClass}>
                    Americano
                  </SelectItem>
                  <SelectItem value="single_elimination" className={cpSelectItemClass}>
                    Elimination
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as NonNullable<PublicTournamentsListQuery["category"]>);
                  setPage(1);
                }}
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All categories
                  </SelectItem>
                  <SelectItem value="Male" className={cpSelectItemClass}>
                    Male
                  </SelectItem>
                  <SelectItem value="Female" className={cpSelectItemClass}>
                    Female
                  </SelectItem>
                  <SelectItem value="Mix" className={cpSelectItemClass}>
                    Mix
                  </SelectItem>
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
                <SelectTrigger
                  className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11 sm:col-span-2 lg:col-span-1")}
                >
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="startsAt-desc" className={cpSelectItemClass}>
                    Date (newest)
                  </SelectItem>
                  <SelectItem value="startsAt-asc" className={cpSelectItemClass}>
                    Date (oldest)
                  </SelectItem>
                  <SelectItem value="name-asc" className={cpSelectItemClass}>
                    Name (A–Z)
                  </SelectItem>
                  <SelectItem value="updated-desc" className={cpSelectItemClass}>
                    Recently updated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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
