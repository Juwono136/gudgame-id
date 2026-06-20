"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Loader2,
  Plus,
  Search,
  Trophy,
} from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { StatCard } from "@/components/admin/ui/stat-card";
import { SportFormDialog } from "@/components/admin/sports/sport-form-dialog";
import { SportsSortableTable } from "@/components/admin/sports/sports-sortable-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminSportsList,
  useCreateAdminSport,
  useDeleteAdminSport,
  useReorderAdminSports,
  useUpdateAdminSport,
} from "@/hooks/use-admin-sports";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { AdminSessionContext } from "@/lib/admin/types";
import { SPORT_VISIBILITY } from "@/lib/domain/sports";
import type { SportDetail } from "@/lib/sports/service";
import type { AdminSportsListQuery } from "@/lib/validations/sports-admin";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type SportsManagementPageProps = {
  context: AdminSessionContext;
};

export function SportsManagementPage({ context }: SportsManagementPageProps) {
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [visibilityFilter, setVisibilityFilter] =
    useState<AdminSportsListQuery["visibility"]>("all");
  const [statusFilter, setStatusFilter] =
    useState<AdminSportsListQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<AdminSportsListQuery["sortBy"]>("displayOrder");
  const [sortDir, setSortDir] = useState<AdminSportsListQuery["sortDir"]>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<SportDetail | null>(null);

  const queryParams: AdminSportsListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      visibility: visibilityFilter,
      status: statusFilter,
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, visibilityFilter, statusFilter, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = useAdminSportsList(queryParams);
  const createSport = useCreateAdminSport();
  const updateSport = useUpdateAdminSport(editingSport?.id ?? "");
  const reorderSports = useReorderAdminSports();
  const deleteSport = useDeleteAdminSport();
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedOrderRef = useRef<string>("");
  const pendingReorderRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (data?.orderSnapshot?.length) {
      lastPersistedOrderRef.current = data.orderSnapshot.map((s) => s.id).join(",");
    }
  }, [data?.orderSnapshot]);

  const canReorder =
    sortBy === "displayOrder" &&
    sortDir === "asc" &&
    visibilityFilter === "all" &&
    statusFilter === "all" &&
    !debouncedSearch;

  const stats = data?.stats ?? {
    total: data?.total ?? 0,
    live: 0,
    comingSoon: 0,
    hidden: 0,
    active: 0,
  };

  const openCreate = () => {
    setEditingSport(null);
    setDialogOpen(true);
  };

  const openEdit = (sport: SportDetail) => {
    setEditingSport(sport);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    if (editingSport) {
      await updateSport.mutateAsync(formData);
    } else {
      await createSport.mutateAsync(formData);
    }
    setDialogOpen(false);
    setEditingSport(null);
  };

  const flushReorder = useCallback(() => {
    const next = pendingReorderRef.current;
    if (!next) return;
    const key = next.join(",");
    if (key === lastPersistedOrderRef.current) {
      pendingReorderRef.current = null;
      return;
    }
    reorderSports.mutate(next, {
      onSuccess: () => {
        lastPersistedOrderRef.current = key;
        pendingReorderRef.current = null;
      },
    });
  }, [reorderSports]);

  const handlePageReorder = useCallback(
    (newPageIds: string[]) => {
      if (!data?.orderSnapshot.length || !data.items.length) return;
      const global = data.orderSnapshot.map((s) => s.id);
      const start = global.indexOf(data.items[0]!.id);
      if (start < 0) return;
      const next = [...global];
      next.splice(start, data.items.length, ...newPageIds);

      const key = next.join(",");
      if (key === lastPersistedOrderRef.current) return;

      pendingReorderRef.current = next;
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        reorderTimerRef.current = null;
        flushReorder();
      }, 450);
    },
    [data?.orderSnapshot, data?.items, flushReorder],
  );

  useEffect(() => {
    return () => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    };
  }, []);

  const handleDeleteFromTable = async (sport: SportDetail) => {
    const ok = await confirm({
      title: "Permanently delete sport?",
      description: `"${sport.name}" will be removed from the database. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    await deleteSport.mutateAsync(sport.id);
  };

  const handleDeleteFromDialog = async (sport: SportDetail) => {
    await deleteSport.mutateAsync(sport.id);
    setDialogOpen(false);
    setEditingSport(null);
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <AdminShell context={context} title="Sports">
      <div className="space-y-4 sm:space-y-6">
        <p className="hidden text-sm leading-relaxed text-cp-muted sm:block">
          Add and configure sport disciplines. Each sport has its own players, gear,
          tournaments, and rules — scoped by sport context across the admin console.
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard label="Total sports" value={String(stats.total)} />
          <StatCard label="Live" value={String(stats.live)} />
          <StatCard label="Coming soon" value={String(stats.comingSoon)} />
          <StatCard label="Active" value={String(stats.active)} />
        </div>

        <div className="overflow-hidden rounded-xl border border-cp-border bg-cp-card cp-shadow-card sm:rounded-2xl">
          <div className="border-b border-cp-border p-3 sm:p-4 lg:p-5">
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
              <Button
                onClick={openCreate}
                className="h-10 w-auto shrink-0 self-start bg-cp-primary px-3 hover:bg-cp-primary-light sm:h-11 sm:px-4"
                aria-label="Add sport"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add sport</span>
              </Button>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or slug…"
                  className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-10 text-foreground sm:h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:max-w-2xl lg:shrink-0">
                <Select
                  value={visibilityFilter}
                  onValueChange={(v) => {
                    setVisibilityFilter(v as AdminSportsListQuery["visibility"]);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent className={cn(cpSelectContentClass, "z-[200]")}>
                    <SelectItem value="all" className={cpSelectItemClass}>
                      All visibility
                    </SelectItem>
                    {SPORT_VISIBILITY.map((v) => (
                      <SelectItem key={v} value={v} className={cpSelectItemClass}>
                        {v.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as AdminSportsListQuery["status"]);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className={cn(cpSelectContentClass, "z-[200]")}>
                    <SelectItem value="all" className={cpSelectItemClass}>
                      All status
                    </SelectItem>
                    <SelectItem value="active" className={cpSelectItemClass}>
                      Active
                    </SelectItem>
                    <SelectItem value="inactive" className={cpSelectItemClass}>
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={`${sortBy}-${sortDir}`}
                  onValueChange={(v) => {
                    const [by, dir] = v.split("-") as [
                      AdminSportsListQuery["sortBy"],
                      AdminSportsListQuery["sortDir"],
                    ];
                    setSortBy(by);
                    setSortDir(dir);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      cpSelectTriggerClass,
                      "col-span-2 h-10 w-full sm:col-span-1 sm:h-11",
                    )}
                  >
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className={cn(cpSelectContentClass, "z-[200]")}>
                    <SelectItem value="displayOrder-asc" className={cpSelectItemClass}>
                      Display order
                    </SelectItem>
                    <SelectItem value="name-asc" className={cpSelectItemClass}>
                      Name A–Z
                    </SelectItem>
                    <SelectItem value="name-desc" className={cpSelectItemClass}>
                      Name Z–A
                    </SelectItem>
                    <SelectItem value="updated-desc" className={cpSelectItemClass}>
                      Recently updated
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {canReorder ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-cp-muted sm:mt-3 sm:text-xs lg:hidden">
                <GripHorizontal className="h-3.5 w-3.5 shrink-0" />
                Drag rows to change homepage display order.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-cp-muted sm:mt-3 sm:text-xs lg:hidden">
                Clear filters and sort by display order to enable drag-and-drop reordering.
              </p>
            )}
          </div>
          {isFetching && !isLoading ? (
            <div className="flex items-center justify-center gap-2 border-b border-cp-border py-2 text-xs text-cp-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </div>
          ) : null}

          {error ? (
            <p className="p-10 text-center text-sm text-red-500 dark:text-red-400">
              Failed to load sports.
            </p>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-cp-elevated" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Trophy className="h-10 w-10 text-cp-muted" />
              <p className="text-sm text-cp-muted">No sports match your filters.</p>
              <Button onClick={openCreate} size="sm" className="bg-cp-primary">
                Add sport
              </Button>
            </div>
          ) : (
            <>
              {canReorder ? (
                <p className="hidden items-center gap-2 border-b border-cp-border px-4 py-2.5 text-xs text-cp-muted lg:flex">
                  <GripHorizontal className="h-3.5 w-3.5 shrink-0" />
                  Drag rows to change homepage display order.
                </p>
              ) : (
                <p className="hidden border-b border-cp-border px-4 py-2.5 text-xs text-cp-muted lg:block">
                  Clear filters and sort by display order to enable drag-and-drop reordering.
                </p>
              )}
              <SportsSortableTable
                items={data.items}
                canReorder={canReorder}
                onPageReorder={handlePageReorder}
                onEdit={openEdit}
                onDelete={handleDeleteFromTable}
                reordering={reorderSports.isPending}
              />
            </>
          )}
        </div>

        {data && totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-cp-border"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-2 text-sm text-cp-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-cp-border"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <SportFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sport={editingSport}
        onSubmit={handleSubmit}
        onDelete={handleDeleteFromDialog}
        isPending={createSport.isPending || updateSport.isPending}
        isDeleting={deleteSport.isPending}
      />
    </AdminShell>
  );
}
