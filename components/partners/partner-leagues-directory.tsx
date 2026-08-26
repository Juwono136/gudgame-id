"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import { CompetitionListSkeleton } from "@/components/dashboard/player/competition/competition-list-loading";
import { PartnerDashboardCardActions } from "@/components/partners/partner-dashboard-card-actions";
import { PartnerDirectoryToolbar } from "@/components/partners/partner-directory-toolbar";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerLeagueDiscoveryCard } from "@/components/partners/partner-league-discovery-card";
import { PartnerLeagueRow } from "@/components/partners/partner-league-row";
import {
  PartnerListFetchingOverlay,
  PartnerLoadingOverlay,
} from "@/components/partners/partner-loading";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useDirectoryViewMode } from "@/hooks/use-directory-view-mode";
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
  { value: "public", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

const STATUS_OPTIONS_DASHBOARD = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
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
  const [viewMode, setViewMode] = useDirectoryViewMode(`partner-leagues-${mode}`);

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
        "This permanently removes the league, teams, matches, and standings. Linked tournaments stay but become ungrouped. This cannot be undone.",
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
  const defaultStatus = mode === "public" ? "public" : "all";

  return (
    <div className="relative space-y-4">
      <PartnerLoadingOverlay
        show={Boolean(deletingId)}
        label="Deleting league…"
        variant="fullscreen"
      />

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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="relative min-h-[12rem]">
        {isFetching && !isLoading ? <PartnerListFetchingOverlay /> : null}
        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
            <CompetitionListSkeleton rows={5} />
          </div>
        ) : isError ? (
          <p className="rounded-2xl border border-cp-border bg-cp-card px-4 py-10 text-center text-sm text-destructive sm:px-5">
            {error instanceof Error ? error.message : "Could not load leagues"}
          </p>
        ) : empty ? (
          <div className="rounded-2xl border border-cp-border bg-cp-card">
            <PartnerEmptyState
              title={
                debouncedSearch || status !== defaultStatus
                  ? "No matching leagues"
                  : "No leagues yet"
              }
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
          </div>
        ) : viewMode === "list" ? (
          <ul className="space-y-2.5 sm:space-y-3">
            {items.map((league) => {
              const publicHref = partnerPublicRoutes.league(partnerSlug, league.slug);
              if (mode === "public") {
                return (
                  <PartnerLeagueRow key={league.id} league={league} href={publicHref} />
                );
              }
              return (
                <PartnerLeagueRow
                  key={league.id}
                  league={league}
                  href={dashboardRoutes.partnerLeague(league.id)}
                  publicHref={publicHref}
                  manageHref={dashboardRoutes.partnerLeague(league.id)}
                  editHref={dashboardRoutes.partnerLeagueEdit(league.id)}
                  onDelete={() => void handleDelete(league)}
                  deleting={deletingId === league.id}
                />
              );
            })}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((league) => {
              const publicHref = partnerPublicRoutes.league(partnerSlug, league.slug);
              if (mode === "public") {
                return (
                  <PartnerLeagueDiscoveryCard
                    key={league.id}
                    league={league}
                    href={publicHref}
                  />
                );
              }

              const manageHref = dashboardRoutes.partnerLeague(league.id);
              return (
                <PartnerLeagueDiscoveryCard
                  key={league.id}
                  league={league}
                  href={manageHref}
                  actions={
                    <PartnerDashboardCardActions
                      manageHref={manageHref}
                      publicHref={publicHref}
                      editHref={dashboardRoutes.partnerLeagueEdit(league.id)}
                      onDelete={() => void handleDelete(league)}
                      deleting={deletingId === league.id}
                    />
                  }
                />
              );
            })}
          </div>
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
