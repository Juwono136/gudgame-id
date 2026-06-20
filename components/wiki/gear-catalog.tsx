"use client";

import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import { GearCard } from "@/components/wiki/gear-card";
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
} from "@/components/dashboard/player/competition/competition-list-loading";
import { useDebounce } from "@/hooks/use-debounce";
import { usePublicGearList } from "@/hooks/use-public-gear";
import {
  GEAR_CATEGORIES,
  GEAR_CATEGORY_LABELS,
} from "@/lib/wiki/gear/constants";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import type { PublicGearListQuery } from "@/lib/validations/public-wiki";
import { cn } from "@/lib/utils";

type GearCatalogProps = {
  sportSlug: string;
  sportName: string;
};

export function GearCatalog({ sportSlug, sportName }: GearCatalogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<PublicGearListQuery["category"]>("all");
  const [sortBy, setSortBy] = useState<PublicGearListQuery["sortBy"]>("name");
  const [sortDir, setSortDir] = useState<PublicGearListQuery["sortDir"]>("asc");

  const queryParams = useMemo(
    (): PublicGearListQuery => ({
      page,
      pageSize: 24,
      search: debouncedSearch || undefined,
      category,
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, category, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = usePublicGearList(sportSlug, queryParams);

  return (
    <div>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
          Gear & Tools
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cp-muted sm:text-base">
          Browse published {sportName.toLowerCase()} equipment — rackets, shoes, bags, and more from
          the community wiki.
        </p>
        {data ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-cp-border bg-cp-elevated/40 px-3 py-1 text-xs font-medium text-cp-muted">
            <Package className="h-3.5 w-3.5" />
            {data.total} item{data.total === 1 ? "" : "s"}
          </p>
        ) : null}
      </header>

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="border-b border-cp-border p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search gear name, brand, or model…"
                className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-9 text-foreground sm:h-11"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as PublicGearListQuery["category"]);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11 sm:w-[160px]")}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="all" className={cpSelectItemClass}>
                    All categories
                  </SelectItem>
                  {GEAR_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className={cpSelectItemClass}>
                      {GEAR_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={`${sortBy}-${sortDir}`}
                onValueChange={(v) => {
                  const [sb, sd] = v.split("-") as [
                    PublicGearListQuery["sortBy"],
                    PublicGearListQuery["sortDir"],
                  ];
                  setSortBy(sb);
                  setSortDir(sd);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11 sm:w-[180px]")}
                >
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  <SelectItem value="name-asc" className={cpSelectItemClass}>
                    Name (A–Z)
                  </SelectItem>
                  <SelectItem value="name-desc" className={cpSelectItemClass}>
                    Name (Z–A)
                  </SelectItem>
                  <SelectItem value="price-asc" className={cpSelectItemClass}>
                    Price (low–high)
                  </SelectItem>
                  <SelectItem value="price-desc" className={cpSelectItemClass}>
                    Price (high–low)
                  </SelectItem>
                  <SelectItem value="newest-desc" className={cpSelectItemClass}>
                    Newest first
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="relative p-3 sm:p-4 lg:p-5">
          {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}

          {error ? (
            <div className="py-16 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load gear"}
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-xl border border-cp-border bg-cp-elevated"
                />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Package className="h-10 w-10 text-cp-muted" />
              <p className="text-sm text-cp-muted">
                {debouncedSearch || category !== "all"
                  ? "No gear matches your filters."
                  : `No published gear for ${sportName} yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {data?.items.map((item, index) => (
                <GearCard
                  key={item.slug}
                  sportSlug={sportSlug}
                  item={item}
                  priority={page === 1 && index < 4}
                />
              ))}
            </div>
          )}
        </div>

        {data && data.totalPages > 1 ? (
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
