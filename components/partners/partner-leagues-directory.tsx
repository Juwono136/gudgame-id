"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import { PartnerDirectoryToolbar } from "@/components/partners/partner-directory-toolbar";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import type { PartnerLeagueListItem } from "@/lib/partners/league-types";
import type { PartnerLeaguesListQuery } from "@/lib/partners/list-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PartnerLeaguesDirectoryProps = {
  mode: "public" | "dashboard";
  partnerSlug: string;
};

type ListResponse = {
  items: PartnerLeagueListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const STATUS_OPTIONS_PUBLIC = [
  { value: "public", label: "All visible" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

const STATUS_OPTIONS_DASHBOARD = [
  { value: "all", label: "All statuses" },
  { value: "public", label: "Public (active + completed)" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "createdAt", label: "Created" },
  { value: "name", label: "Name" },
];

export function PartnerLeaguesDirectory({ mode, partnerSlug }: PartnerLeaguesDirectoryProps) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PartnerLeaguesListQuery["status"]>(
    mode === "public" ? "public" : "all",
  );
  const [sortBy, setSortBy] = useState<PartnerLeaguesListQuery["sortBy"]>("updatedAt");
  const [sortDir, setSortDir] = useState<PartnerLeaguesListQuery["sortDir"]>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sortBy, sortDir]);

  const query = useMemo(
    (): PartnerLeaguesListQuery => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status,
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, status, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["partner-leagues", mode, partnerSlug, query],
    queryFn: async (): Promise<ListResponse> => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.search) params.set("search", query.search);
      params.set("status", query.status);
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const url =
        mode === "public"
          ? `/api/partner/public/${encodeURIComponent(partnerSlug)}/leagues?${params}`
          : `/api/partner/leagues?${params}`;

      const res = await fetch(url);
      const json = await parseJsonResponse<{ success: true; data: ListResponse }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not load leagues",
        );
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });

  const handleDelete = async (league: PartnerLeagueListItem) => {
    const ok = await confirm({
      title: `Delete "${league.name}"?`,
      description:
        "This permanently removes the league, teams, matches, and standings. This cannot be undone.",
      confirmLabel: "Delete league",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;

    setDeletingId(league.id);
    try {
      const res = await fetch(`/api/partner/leagues/${league.id}`, { method: "DELETE" });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not delete league",
        );
        return;
      }
      toast.success("League deleted");
      await queryClient.invalidateQueries({ queryKey: ["partner-leagues"] });
    } finally {
      setDeletingId(null);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const empty = !isLoading && items.length === 0;

  return (
    <div className="relative space-y-4">
      {deletingId ? <LoadingOverlay show label="Deleting league…" /> : null}

      <PartnerDirectoryToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search leagues…"
        status={status}
        onStatusChange={(v) => setStatus(v as PartnerLeaguesListQuery["status"])}
        statusOptions={mode === "public" ? STATUS_OPTIONS_PUBLIC : STATUS_OPTIONS_DASHBOARD}
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v as PartnerLeaguesListQuery["sortBy"])}
        sortOptions={SORT_OPTIONS}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
      />

      <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card/90 shadow-sm backdrop-blur-sm">
        {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}
        {isLoading ? (
          <CompetitionListSkeleton rows={5} />
        ) : isError ? (
          <p className="px-4 py-10 text-center text-sm text-destructive sm:px-5">
            {error instanceof Error ? error.message : "Could not load leagues"}
          </p>
        ) : empty ? (
          <PartnerEmptyState
            title={debouncedSearch || status !== (mode === "public" ? "public" : "all")
              ? "No matching leagues"
              : "No leagues yet"}
            description={
              debouncedSearch
                ? "Try another search or filter."
                : mode === "dashboard"
                  ? "Create a league, add teams, and enter match scores manually."
                  : "Check back soon for league standings and results."
            }
            action={
              mode === "dashboard" && !debouncedSearch && status === "all" ? (
                <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
                  <Link href={dashboardRoutes.partnerLeaguesNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create league
                  </Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-cp-border">
            {items.map((league) => (
              <li key={league.id}>
                {mode === "public" ? (
                  <Link
                    href={partnerPublicRoutes.league(partnerSlug, league.slug)}
                    className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-cp-elevated/40 sm:px-5"
                  >
                    <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{league.name}</span>
                        <PartnerStatusBadge status={league.status} />
                      </div>
                      <p className="mt-1 text-xs text-cp-muted">
                        {league.sportName} · {league.teamCount} teams · {league.matchCount} matches
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Trophy className="h-4 w-4 shrink-0 text-cp-primary" />
                        <Link
                          href={dashboardRoutes.partnerLeague(league.id)}
                          className="truncate font-semibold text-foreground hover:text-cp-primary"
                        >
                          {league.name}
                        </Link>
                        <PartnerStatusBadge status={league.status} />
                      </div>
                      <p className="mt-1 text-xs text-cp-muted">
                        {league.sportName} · {league.teamCount} teams · {league.matchCount} matches
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="border-cp-border">
                        <Link
                          href={partnerPublicRoutes.league(partnerSlug, league.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Public
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="border-cp-border">
                        <Link href={dashboardRoutes.partnerLeague(league.id)}>Edit</Link>
                      </Button>
                      <Button asChild size="sm" className="bg-cp-primary hover:bg-cp-primary-light">
                        <Link href={dashboardRoutes.partnerLeague(league.id)}>Manage</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        disabled={deletingId === league.id}
                        onClick={() => void handleDelete(league)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
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
        disabled={isFetching}
      />
    </div>
  );
}
