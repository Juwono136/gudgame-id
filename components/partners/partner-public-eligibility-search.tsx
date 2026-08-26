"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import { CompetitionListSkeleton } from "@/components/dashboard/player/competition/competition-list-loading";
import { PartnerDirectoryToolbar } from "@/components/partners/partner-directory-toolbar";
import { PartnerListFetchingOverlay } from "@/components/partners/partner-loading";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { PartnerEligibilityListQuery } from "@/lib/partners/list-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EligibilityRecord = {
  playerName: string;
  tournamentName: string;
  categoryLabel: string | null;
  farthestRound: string;
  doublesPartnerName: string | null;
  tournamentStatus: string;
  playedAt: string | null;
};

type ListResponse = {
  items?: EligibilityRecord[];
  records?: EligibilityRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
};

type PartnerPublicEligibilitySearchProps = {
  partnerSlug: string;
  partnerName: string;
  className?: string;
  /** Hide page title when nested under Players tabs. */
  embedded?: boolean;
};

const SORT_OPTIONS = [
  { value: "playedAt", label: "Most recent" },
  { value: "playerName", label: "Player name" },
  { value: "tournamentName", label: "Tournament" },
];

export function PartnerPublicEligibilitySearch({
  partnerSlug,
  partnerName,
  className,
  embedded = false,
}: PartnerPublicEligibilitySearchProps) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 400);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<PartnerEligibilityListQuery["sortBy"]>("playedAt");
  const [sortDir, setSortDir] =
    useState<PartnerEligibilityListQuery["sortDir"]>("desc");

  const trimmed = debouncedQ.trim();
  const searchTooShort = trimmed.length === 1;

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, sortBy, sortDir]);

  const query = useMemo(
    (): PartnerEligibilityListQuery => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      q: trimmed.length >= 2 ? trimmed : undefined,
      sortBy,
      sortDir,
    }),
    [page, trimmed, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["partner-eligibility", partnerSlug, query],
    enabled: !searchTooShort,
    queryFn: async (): Promise<ListResponse> => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.q) params.set("q", query.q);
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/eligibility?${params}`,
      );
      const json = await parseJsonResponse<{ success: true; data: ListResponse }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Search failed",
        );
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    }
  }, [isError, error]);

  const records = data?.items ?? data?.records ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className={cn("space-y-5", className)}>
      {!embedded ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cp-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Player history
            </h1>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-cp-muted sm:text-base">
            Internal lookup for {partnerName} staff — tournament, category, how far a player
            advanced, and doubles partner.
          </p>
        </div>
      ) : (
        <p className="text-sm text-cp-muted">
          Per-tournament advancement lookup for curation — category, farthest round, and doubles
          partner.
        </p>
      )}

      <PartnerDirectoryToolbar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search player or tournament…"
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v as PartnerEligibilityListQuery["sortBy"])}
        sortOptions={SORT_OPTIONS}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
      />

      {searchTooShort ? (
        <p className="text-sm text-cp-muted">Type at least 2 characters to search.</p>
      ) : null}

      <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card/90 shadow-sm backdrop-blur-sm">
        {isFetching && !isLoading ? <PartnerListFetchingOverlay /> : null}
        {isLoading ? (
          <CompetitionListSkeleton rows={6} />
        ) : records.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-cp-muted sm:px-5">
            {trimmed
              ? "No matching history yet."
              : "No history yet. Results appear after players compete in partner events."}
          </div>
        ) : (
          <ul className="divide-y divide-cp-border">
            {records.map((r, i) => (
              <li
                key={`${r.playerName}-${r.tournamentName}-${i}`}
                className="space-y-1 px-4 py-3.5 transition-colors hover:bg-cp-elevated/40 sm:px-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-foreground">{r.playerName}</p>
                  <span className="rounded-full border border-cp-border/80 bg-cp-elevated/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-cp-muted">
                    {r.farthestRound}
                  </span>
                </div>
                <p className="text-sm text-cp-muted">
                  {r.tournamentName}
                  {r.categoryLabel ? ` · ${r.categoryLabel}` : ""}
                </p>
                {r.doublesPartnerName ? (
                  <p className="text-xs text-cp-muted">
                    Doubles partner:{" "}
                    <span className="font-medium text-foreground">{r.doublesPartnerName}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CompetitionListPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={DEFAULT_PAGE_SIZE}
        onPageChange={setPage}
        disabled={isFetching || searchTooShort}
      />
    </div>
  );
}
