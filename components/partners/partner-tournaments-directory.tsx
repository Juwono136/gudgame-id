"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import {
  CompetitionListFetchingOverlay,
  CompetitionListSkeleton,
} from "@/components/dashboard/player/competition/competition-list-loading";
import { PartnerDashboardCardActions } from "@/components/partners/partner-dashboard-card-actions";
import { PartnerDirectoryToolbar } from "@/components/partners/partner-directory-toolbar";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import { PartnerTournamentRow } from "@/components/partners/partner-tournament-row";
import { TournamentDiscoveryCard } from "@/components/tournaments/tournament-discovery-card";
import { TournamentDiscoveryPublicCard } from "@/components/tournaments/tournament-discovery-public-card";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useDebounce } from "@/hooks/use-debounce";
import { useDirectoryViewMode } from "@/hooks/use-directory-view-mode";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import type { PartnerTournamentsListQuery } from "@/lib/partners/list-query";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PartnerTournamentsDirectoryProps = {
  mode: "public" | "dashboard";
  partnerSlug: string;
  primaryColor?: string;
};

type ListResponse = {
  items: TournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const STATUS_OPTIONS_PUBLIC = [
  { value: "all", label: "All" },
  { value: "active", label: "Live & upcoming" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

const STATUS_OPTIONS_DASHBOARD = [
  ...STATUS_OPTIONS_PUBLIC,
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "startsAt", label: "Start date" },
  { value: "name", label: "Name" },
];

export function PartnerTournamentsDirectory({
  mode,
  partnerSlug,
}: PartnerTournamentsDirectoryProps) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PartnerTournamentsListQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<PartnerTournamentsListQuery["sortBy"]>("updatedAt");
  const [sortDir, setSortDir] = useState<PartnerTournamentsListQuery["sortDir"]>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useDirectoryViewMode(`partner-tournaments-${mode}`);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sortBy, sortDir]);

  const query = useMemo(
    (): PartnerTournamentsListQuery => ({
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
    queryKey: ["partner-tournaments", mode, partnerSlug, query],
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
          ? `/api/partner/public/${encodeURIComponent(partnerSlug)}/tournaments?${params}`
          : `/api/partner/tournaments?${params}`;

      const res = await fetch(url);
      const json = await parseJsonResponse<{ success: true; data: ListResponse }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Could not load tournaments",
        );
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });

  const handleDelete = async (t: TournamentListItem) => {
    if (t.status === "live") return;

    const ok = await confirm({
      title: `Delete "${t.name}"?`,
      description:
        "This cannot be undone. Tournaments with paid registrations or active brackets cannot be deleted.",
      confirmLabel: "Delete tournament",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;

    setDeletingId(t.id);
    try {
      const res = await fetch(`/api/partner/tournaments/${t.id}`, { method: "DELETE" });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        toast.error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not delete tournament",
        );
        return;
      }
      toast.success("Tournament deleted");
      await queryClient.invalidateQueries({ queryKey: ["partner-tournaments"] });
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
      {deletingId ? <LoadingOverlay show label="Deleting tournament…" /> : null}

      <PartnerDirectoryToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cups…"
        status={status}
        onStatusChange={(v) => setStatus(v as PartnerTournamentsListQuery["status"])}
        statusOptions={mode === "public" ? STATUS_OPTIONS_PUBLIC : STATUS_OPTIONS_DASHBOARD}
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v as PartnerTournamentsListQuery["sortBy"])}
        sortOptions={SORT_OPTIONS}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="relative min-h-[12rem]">
        {isFetching && !isLoading ? <CompetitionListFetchingOverlay /> : null}
        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
            <CompetitionListSkeleton rows={6} />
          </div>
        ) : isError ? (
          <p className="rounded-2xl border border-cp-border bg-cp-card px-4 py-10 text-center text-sm text-destructive sm:px-5">
            {error instanceof Error ? error.message : "Could not load tournaments"}
          </p>
        ) : empty ? (
          <div className="rounded-2xl border border-cp-border bg-cp-card">
            <PartnerEmptyState
              title={
                debouncedSearch || status !== "all"
                  ? "No matching tournaments"
                  : "No tournaments yet"
              }
              description={
                debouncedSearch || status !== "all"
                  ? "Try another search, status, or sort order."
                  : mode === "dashboard"
                    ? "Set up a double-stage, knockout, or Americano event for your club."
                    : "When this partner publishes an event, it will appear here."
              }
              action={
                mode === "dashboard" && !debouncedSearch && status === "all" ? (
                  <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
                    <Link href={dashboardRoutes.partnerTournamentsNew}>
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Create tournament
                    </Link>
                  </Button>
                ) : null
              }
            />
          </div>
        ) : viewMode === "list" ? (
          <ul className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
            {items.map((t) => {
              const publicHref = partnerPublicRoutes.tournament(partnerSlug, t.slug);
              if (mode === "public") {
                return (
                  <PartnerTournamentRow key={t.id} tournament={t} href={publicHref} />
                );
              }
              return (
                <PartnerTournamentRow
                  key={t.id}
                  tournament={t}
                  publicHref={publicHref}
                  manageHref={partnerPublicRoutes.tournamentManage(partnerSlug, t.slug)}
                  editHref={
                    t.status === "completed" || t.status === "cancelled"
                      ? undefined
                      : dashboardRoutes.partnerTournamentEdit(t.id)
                  }
                  onDelete={() => void handleDelete(t)}
                  deleteDisabled={t.status === "live"}
                  deleteDisabledReason="Cannot delete a live tournament. Mark it completed or cancelled first."
                  deleting={deletingId === t.id}
                />
              );
            })}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {items.map((t) => {
              const publicHref = partnerPublicRoutes.tournament(partnerSlug, t.slug);
              const registerHref = partnerPublicRoutes.tournamentRegister(partnerSlug, t.slug);
              if (mode === "public") {
                return (
                  <TournamentDiscoveryPublicCard
                    key={t.id}
                    tournament={t}
                    detailHref={publicHref}
                    registerHref={registerHref}
                  />
                );
              }

              const canEdit = t.status !== "completed" && t.status !== "cancelled";
              const manageHref = partnerPublicRoutes.tournamentManage(partnerSlug, t.slug);
              return (
                <TournamentDiscoveryCard
                  key={t.id}
                  tournament={t}
                  href={manageHref}
                  actions={
                    <PartnerDashboardCardActions
                      manageHref={manageHref}
                      publicHref={publicHref}
                      editHref={
                        canEdit ? dashboardRoutes.partnerTournamentEdit(t.id) : undefined
                      }
                      onDelete={() => void handleDelete(t)}
                      deleteDisabled={t.status === "live"}
                      deleteDisabledReason="Cannot delete a live tournament. Mark it completed or cancelled first."
                      deleting={deletingId === t.id}
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
