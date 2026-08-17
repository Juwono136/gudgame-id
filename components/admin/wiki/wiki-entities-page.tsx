"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Info,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { StatCard } from "@/components/admin/ui/stat-card";
import { AdminLoadingOverlay } from "@/components/admin/ui/admin-loading-overlay";
import { WikiEntityThumbnail } from "@/components/admin/wiki/wiki-entity-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import {
  useWikiEntitiesList,
  useDeleteWikiEntity,
  useBulkDeleteWikiDirectory,
  useBulkPublishWikiDirectory,
} from "@/hooks/use-wiki-entities";
import { useDeleteAdminTournament } from "@/hooks/use-tournaments";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { AdminSessionContext } from "@/lib/admin/types";
import { adminRoutes } from "@/lib/constants/routes";
import {
  getPublicWikiPath,
  WIKI_DIRECTORY_ENTITY_LABELS,
  WIKI_DIRECTORY_TYPE_FILTER_OPTIONS,
  WIKI_STATUS_LABELS,
} from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/lib/domain/wiki";
import {
  getWikiDirectoryItemKey,
  type WikiDirectoryListItem,
} from "@/lib/wiki/directory-types";
import {
  countDeletableSelection,
  countDeletableSelectionOnPage,
  countPublishableSelection,
  DIRECTORY_BULK_ACTION_MAX,
  directorySelectionEntryFromItem,
  partitionSelectionForBulkDelete,
  partitionSelectionForBulkPublish,
  type DirectorySelectionEntry,
} from "@/lib/wiki/directory-selection";
import type { WikiDirectoryTypeFilterValue } from "@/lib/wiki/constants";
import type { TournamentStatus } from "@/lib/domain/tournaments";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/tournaments/constants";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { useAdminSport } from "@/providers/admin-sport-provider";
import { getDirectoryStatusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type WikiEntitiesPageProps = {
  context: AdminSessionContext;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function getDirectoryTypeLabel(item: WikiDirectoryListItem) {
  return WIKI_DIRECTORY_ENTITY_LABELS[item.entityType];
}

function getDirectoryStatusLabel(item: WikiDirectoryListItem) {
  if (item.recordKind === "tournament") {
    const key = item.status as TournamentStatus;
    return TOURNAMENT_STATUS_LABELS[key] ?? item.status;
  }
  return WIKI_STATUS_LABELS[item.status as keyof typeof WIKI_STATUS_LABELS] ?? item.status;
}

function getDirectoryStatusClass(item: WikiDirectoryListItem) {
  return getDirectoryStatusBadgeClass(item);
}

function canViewPublic(item: WikiDirectoryListItem) {
  if (item.recordKind === "tournament") {
    return item.status !== "draft" && item.status !== "cancelled";
  }
  return item.status === "published";
}

function getPublicHref(item: WikiDirectoryListItem) {
  if (item.recordKind === "tournament") {
    return publicSportRoutes.tournament(item.sportSlug, item.slug);
  }
  return getPublicWikiPath(
    item.sportSlug,
    item.entityType as WikiEntityType,
    item.slug,
  );
}

function getEditHref(item: WikiDirectoryListItem) {
  if (item.recordKind === "tournament") {
    return adminRoutes.tournamentEdit(String(item.id));
  }
  return `${adminRoutes.wikiEntities}/${item.id}/edit`;
}

function canDeleteItem(item: WikiDirectoryListItem) {
  if (item.recordKind === "wiki_entity") return true;
  return item.recordKind === "tournament" && item.status !== "live";
}

function canSelectItem(item: WikiDirectoryListItem) {
  return canDeleteItem(item);
}

function getBulkDeleteBlockedReason(item: WikiDirectoryListItem): string | null {
  if (canDeleteItem(item)) return null;
  if (item.recordKind === "tournament" && item.status === "live") {
    return "Live tournaments cannot be bulk-deleted. End or cancel the event first.";
  }
  return "This item cannot be bulk-deleted.";
}

function estimateDeletableInList(
  stats: {
    player: number;
    gear: number;
    tournaments?: number;
    tournamentsLive?: number;
  } | undefined,
  typeFilter: WikiDirectoryTypeFilterValue,
): number | null {
  if (!stats) return null;

  const wikiDeletable =
    typeFilter === "player"
      ? stats.player
      : typeFilter === "gear"
        ? stats.gear
        : typeFilter === "tournament"
          ? 0
          : stats.player + stats.gear;

  const tournamentDeletable =
    typeFilter === "player" || typeFilter === "gear"
      ? 0
      : Math.max(0, (stats.tournaments ?? 0) - (stats.tournamentsLive ?? 0));

  return wikiDeletable + tournamentDeletable;
}

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-cp-border accent-cp-primary disabled:cursor-not-allowed disabled:opacity-40";

type SelectAllCheckboxProps = {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  "aria-label": string;
  className?: string;
};

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  className,
  "aria-label": ariaLabel,
}: SelectAllCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className={cn(checkboxClass, className)}
    />
  );
}

type DirectoryRowActionsProps = {
  item: WikiDirectoryListItem;
  onDeleteEntity: (id: string, name: string) => void;
  onDeleteTournament: (id: string, name: string) => void;
  variant: "desktop" | "mobile";
};

function DirectoryRowActions({
  item,
  onDeleteEntity,
  onDeleteTournament,
  variant,
}: DirectoryRowActionsProps) {
  const editHref = getEditHref(item);
  const publicHref = canViewPublic(item) ? getPublicHref(item) : null;
  const showDelete = canDeleteItem(item);

  const handleDelete = () => {
    if (item.recordKind === "wiki_entity") {
      onDeleteEntity(item.id, item.displayName);
    } else {
      onDeleteTournament(item.id as string, item.displayName);
    }
  };

  if (variant === "desktop") {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          {publicHref ? (
            <DropdownMenuItem asChild>
              <a href={publicHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View public page
              </a>
            </DropdownMenuItem>
          ) : null}
          {showDelete ? (
            <DropdownMenuItem className="text-red-400" onClick={() => void handleDelete()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pt-0.5">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-10 min-h-10 min-w-[5.5rem] flex-1 border-cp-border px-2 text-xs"
      >
        <Link href={editHref}>
          <Pencil className="mr-1.5 h-4 w-4 shrink-0" />
          Edit
        </Link>
      </Button>
      {publicHref ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-10 min-h-10 min-w-[5.5rem] flex-1 border-cp-border px-2 text-xs"
        >
          <a href={publicHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4 shrink-0" />
            View
          </a>
        </Button>
      ) : null}
      {showDelete ? (
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-10 min-w-[5.5rem] flex-1 border-red-500/30 px-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
          onClick={() => void handleDelete()}
        >
          <Trash2 className="mr-1.5 h-4 w-4 shrink-0" />
          Delete
        </Button>
      ) : null}
    </div>
  );
}

function DirectoryEntityIdentity({ item }: { item: WikiDirectoryListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <WikiEntityThumbnail
        imageUrl={item.primaryImageUrl}
        entityType={item.entityType}
        displayName={item.displayName}
        size="sm"
      />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{item.displayName}</p>
        <p className="truncate text-xs text-cp-muted">/{item.slug}</p>
      </div>
    </div>
  );
}

export function WikiEntitiesPage({ context }: WikiEntitiesPageProps) {
  return (
    <AdminShell context={context} title="Wiki Entities">
      <WikiEntitiesPageContent />
    </AdminShell>
  );
}

function WikiDirectoryBulkHint({
  mode,
}: {
  mode: "protected" | "idle";
}) {
  if (mode === "protected") {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-left sm:px-4"
      >
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            No bulk actions on this page
          </p>
          <p className="text-xs leading-relaxed text-cp-muted">
            Live tournaments are protected and cannot be selected. Switch filters, or open
            another page that includes players, gear, or draft / non-live tournaments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="flex gap-3 rounded-xl border border-cp-border/80 bg-cp-elevated/40 px-3 py-3 text-left sm:px-4"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cp-primary" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">Bulk publish & delete</p>
        <p className="text-xs leading-relaxed text-cp-muted">
          Select draft wiki entities to publish. Players, gear, and non-live tournaments can
          be deleted in bulk. Live tournaments stay locked until the event ends or is
          cancelled.
        </p>
      </div>
    </div>
  );
}

function WikiEntitiesPageContent() {
  const { sportSlug } = useAdminSport();
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<WikiDirectoryTypeFilterValue>("all");
  const [statusFilter, setStatusFilter] =
    useState<WikiEntitiesListQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<WikiEntitiesListQuery["sortBy"]>("updated");
  const [sortDir, setSortDir] = useState<WikiEntitiesListQuery["sortDir"]>("desc");
  const [selection, setSelection] = useState<Map<string, DirectorySelectionEntry>>(
    () => new Map(),
  );

  const queryParams: WikiEntitiesListQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      entityType:
        typeFilter === "all"
          ? undefined
          : (typeFilter as WikiEntitiesListQuery["entityType"]),
      status: statusFilter,
      sortBy,
      sortDir,
    }),
    [page, pageSize, debouncedSearch, typeFilter, statusFilter, sortBy, sortDir],
  );

  useEffect(() => {
    setPage(1);
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSelection(new Map());
  }, [sportSlug]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter, sortBy, sortDir, pageSize]);

  const { data, isLoading, isFetching, error, refetch, isError } = useWikiEntitiesList(
    queryParams,
    sportSlug,
  );
  const deleteEntity = useDeleteWikiEntity();
  const deleteTournament = useDeleteAdminTournament();
  const bulkDelete = useBulkDeleteWikiDirectory();
  const bulkPublish = useBulkPublishWikiDirectory();

  const pageItems = data?.items ?? [];
  const selectableOnPage = useMemo(
    () => pageItems.filter(canSelectItem),
    [pageItems],
  );
  const deletableOnPage = useMemo(
    () => pageItems.filter(canDeleteItem),
    [pageItems],
  );
  const allPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((item) => selection.has(getWikiDirectoryItemKey(item)));
  const somePageSelected = selectableOnPage.some((item) =>
    selection.has(getWikiDirectoryItemKey(item)),
  );
  const selectedDeletableCount = useMemo(
    () => countDeletableSelection(selection),
    [selection],
  );
  const selectedPublishableCount = useMemo(
    () => countPublishableSelection(selection),
    [selection],
  );
  const selectedOnCurrentPageCount = useMemo(
    () => countDeletableSelectionOnPage(selection, pageItems, canSelectItem),
    [selection, pageItems],
  );
  const hasCrossPageSelection =
    selection.size > 0 && selectedOnCurrentPageCount < selection.size;
  const estimatedDeletableTotal = useMemo(
    () => estimateDeletableInList(data?.stats, typeFilter),
    [data?.stats, typeFilter],
  );
  const pageHasOnlyProtectedItems =
    pageItems.length > 0 && deletableOnPage.length === 0;

  // Reset selection when filters change — not when paginating.
  useEffect(() => {
    setSelection(new Map());
  }, [debouncedSearch, typeFilter, statusFilter, sortBy, sortDir, pageSize]);

  const toggleSelectItem = (item: WikiDirectoryListItem) => {
    if (!canSelectItem(item)) return;
    const key = getWikiDirectoryItemKey(item);
    setSelection((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, directorySelectionEntryFromItem(item));
      }
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelection((prev) => {
        const next = new Map(prev);
        for (const item of selectableOnPage) {
          next.delete(getWikiDirectoryItemKey(item));
        }
        return next;
      });
      return;
    }

    setSelection((prev) => {
      const next = new Map(prev);
      for (const item of selectableOnPage) {
        const key = getWikiDirectoryItemKey(item);
        next.set(key, directorySelectionEntryFromItem(item));
      }
      return next;
    });
  };

  const clearSelection = () => setSelection(new Map());

  const handleDeleteEntity = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete wiki entity?",
      description: `"${name}" will be permanently removed including media and relations.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (ok) deleteEntity.mutate({ id, redirectOnSuccess: false });
  };

  const handleBulkDeleteSelected = async () => {
    const entries = [...selection.values()];
    const { wikiEntityIds, tournamentIds, skippedLive } =
      partitionSelectionForBulkDelete(entries);
    const total = wikiEntityIds.length + tournamentIds.length;

    if (total === 0) {
      toast.error("No deletable items selected", {
        description:
          skippedLive > 0
            ? "Live tournaments cannot be deleted from this list."
            : "Select items using the checkboxes first.",
      });
      return;
    }

    if (total > DIRECTORY_BULK_ACTION_MAX) {
      toast.error(`You can delete up to ${DIRECTORY_BULK_ACTION_MAX} items at a time`, {
        description: `You selected ${total} items. Deselect some items or use Delete all in batches.`,
      });
      return;
    }

    const ok = await confirm({
      title: `Delete ${total} selected item${total === 1 ? "" : "s"}?`,
      description:
        hasCrossPageSelection
          ? `Selections span multiple pages (${selectedOnCurrentPageCount} on this page, ${total} total). This permanently removes wiki entities, media, and relations. Live tournaments are skipped.`
          : skippedLive > 0
            ? `${skippedLive} live tournament${skippedLive === 1 ? "" : "s"} in your selection will be skipped. This action permanently removes wiki entities, media, and relations.`
            : "This permanently removes selected wiki entities, media, and relations. This cannot be undone.",
      confirmLabel: "Delete selected",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;

    bulkDelete.mutate(
      { mode: "selection", wikiEntityIds, tournamentIds },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleBulkDeleteAll = async () => {
    const filterSummary = [
      debouncedSearch ? `search “${debouncedSearch}”` : null,
      typeFilter !== "all" ? `type ${typeFilter}` : null,
      statusFilter !== "all" ? `status ${statusFilter}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const totalMatching = data?.total ?? 0;

    const ok = await confirm({
      title: "Delete all items?",
      description: filterSummary
        ? `${totalMatching} item${totalMatching === 1 ? "" : "s"} match ${filterSummary}. Up to ${DIRECTORY_BULK_ACTION_MAX} deletable items will be removed per request. Live tournaments are always skipped.`
        : `All ${totalMatching} item${totalMatching === 1 ? "" : "s"} in this list (up to ${DIRECTORY_BULK_ACTION_MAX} per request) will be deleted. Live tournaments are always skipped.`,
      confirmLabel: "Delete all",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;

    bulkDelete.mutate(
      {
        mode: "filter",
        filter: {
          page: 1,
          pageSize: DIRECTORY_BULK_ACTION_MAX,
          search: debouncedSearch || undefined,
          entityType:
            typeFilter === "all"
              ? undefined
              : (typeFilter as WikiEntitiesListQuery["entityType"]),
          status: statusFilter,
          sortBy,
          sortDir,
        },
      },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleBulkPublishSelected = async () => {
    const entries = [...selection.values()];
    const { wikiEntityIds, skipped } = partitionSelectionForBulkPublish(entries);

    if (wikiEntityIds.length === 0) {
      toast.error("No draft wiki entities selected", {
        description:
          skipped > 0
            ? "Only draft players and gear can be published. Tournaments and already-published items are skipped."
            : "Select draft items using the checkboxes first.",
      });
      return;
    }

    if (wikiEntityIds.length > DIRECTORY_BULK_ACTION_MAX) {
      toast.error(`You can publish up to ${DIRECTORY_BULK_ACTION_MAX} items at a time`, {
        description: `You selected ${wikiEntityIds.length} draft items. Deselect some or publish in batches.`,
      });
      return;
    }

    const ok = await confirm({
      title: `Publish ${wikiEntityIds.length} draft item${wikiEntityIds.length === 1 ? "" : "s"}?`,
      description:
        hasCrossPageSelection
          ? `Publishing ${wikiEntityIds.length} draft wiki entit${wikiEntityIds.length === 1 ? "y" : "ies"} from your selection. They will appear on the public sport wiki.`
          : skipped > 0
            ? `${skipped} selected item${skipped === 1 ? "" : "s"} will be skipped (not draft wiki entities).`
            : "Published entries appear on the public sport wiki.",
      confirmLabel: "Publish selected",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    bulkPublish.mutate(
      { mode: "selection", wikiEntityIds },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleBulkPublishAllDrafts = async () => {
    const draftTotal = data?.stats?.wikiDraft ?? 0;
    const filterSummary = [
      debouncedSearch ? `search “${debouncedSearch}”` : null,
      typeFilter !== "all" ? `type ${typeFilter}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const ok = await confirm({
      title: "Publish all draft wiki entities?",
      description: filterSummary
        ? `Up to ${DIRECTORY_BULK_ACTION_MAX} draft wiki entities matching ${filterSummary} will be published. Tournaments are not included.`
        : `Up to ${DIRECTORY_BULK_ACTION_MAX} draft wiki entities (of ${draftTotal} total drafts) will be published.`,
      confirmLabel: "Publish all drafts",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    bulkPublish.mutate(
      {
        mode: "filter",
        filter: {
          page: 1,
          pageSize: DIRECTORY_BULK_ACTION_MAX,
          search: debouncedSearch || undefined,
          entityType:
            typeFilter === "all"
              ? undefined
              : (typeFilter as WikiEntitiesListQuery["entityType"]),
          status: "draft",
          sortBy,
          sortDir,
        },
      },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleDeleteTournament = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete tournament?",
      description: `"${name}" will be permanently removed. This cannot be undone if registrations exist.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (ok) deleteTournament.mutate(id);
  };

  const totalPages =
    data?.totalPages ?? (data ? Math.ceil(data.total / data.pageSize) : 0);

  return (
    <div className="relative space-y-4 sm:space-y-6">
        <AdminLoadingOverlay show={isFetching && !isLoading} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="hidden text-sm text-cp-muted sm:block">
              Manage tournaments, gear, and{" "}
              <span className="font-medium text-foreground">editorial player profiles</span> you
              created for{" "}
              <span className="font-semibold capitalize text-cp-logo-accent">
                {sportSlug}
              </span>
              . Players who registered through the app are not listed here.
            </p>
            <p className="rounded-lg border border-cp-border/80 bg-cp-elevated/30 px-3 py-2 text-[11px] leading-relaxed text-cp-muted sm:hidden">
              Only entities you created appear here. App sign-up players manage their own profiles.
            </p>
          </div>
          <Button
            asChild
            className="h-10 w-full shrink-0 bg-cp-primary hover:bg-cp-primary-light sm:h-11 sm:w-auto"
          >
            <Link href={adminRoutes.wikiEntitiesNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create entity
            </Link>
          </Button>
        </div>

        {data?.stats ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            <StatCard label="Players" value={String(data.stats.player)} />
            <StatCard label="Tournaments" value={String(data.stats.tournaments)} />
            <StatCard label="Gear" value={String(data.stats.gear)} />
            <StatCard label="Published" value={String(data.stats.published)} />
            <StatCard label="Drafts" value={String(data.stats.draft)} />
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-cp-border bg-cp-card cp-shadow-card sm:rounded-2xl">
          <div className="border-b border-cp-border p-3 sm:p-4 lg:p-5">
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, slug, venue…"
                  className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-10 text-foreground sm:h-11"
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-2xl">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v as WikiDirectoryTypeFilterValue);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className={cn(cpSelectTriggerClass, "h-10 w-full sm:h-11")}>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className={cn(cpSelectContentClass, "z-[200]")}>
                    {WIKI_DIRECTORY_TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className={cpSelectItemClass}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as WikiEntitiesListQuery["status"]);
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
                    <SelectItem value="draft" className={cpSelectItemClass}>
                      Draft
                    </SelectItem>
                    <SelectItem value="published" className={cpSelectItemClass}>
                      Published
                    </SelectItem>
                    <SelectItem value="archived" className={cpSelectItemClass}>
                      Archived
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={`${sortBy}-${sortDir}`}
                  onValueChange={(v) => {
                    const [by, dir] = v.split("-") as [
                      WikiEntitiesListQuery["sortBy"],
                      WikiEntitiesListQuery["sortDir"],
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
                    <SelectItem value="updated-desc" className={cpSelectItemClass}>
                      Recently updated
                    </SelectItem>
                    <SelectItem value="updated-asc" className={cpSelectItemClass}>
                      Oldest updated
                    </SelectItem>
                    <SelectItem value="name-asc" className={cpSelectItemClass}>
                      Name A–Z
                    </SelectItem>
                    <SelectItem value="name-desc" className={cpSelectItemClass}>
                      Name Z–A
                    </SelectItem>
                    <SelectItem value="created-desc" className={cpSelectItemClass}>
                      Newest created
                    </SelectItem>
                    <SelectItem value="created-asc" className={cpSelectItemClass}>
                      Oldest created
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isFetching && !isLoading ? (
            <div className="flex items-center justify-center gap-2 border-b border-cp-border py-2 text-xs text-cp-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </div>
          ) : null}

          {data?.items.length ? (
            <div className="space-y-3 border-b border-cp-border bg-cp-elevated/20 px-3 py-3 sm:px-4 lg:px-5">
              {selection.size === 0 ? (
                <WikiDirectoryBulkHint
                  mode={pageHasOnlyProtectedItems ? "protected" : "idle"}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-cp-muted">
                  <span className="font-medium text-foreground">
                    {selection.size} selected
                    {selectedPublishableCount > 0 ? (
                      <span className="font-normal text-cp-muted">
                        {" "}
                        · {selectedPublishableCount} draft
                        {selectedPublishableCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {hasCrossPageSelection ? (
                      <span className="font-normal text-cp-muted">
                        {" "}
                        · {selectedOnCurrentPageCount} on this page
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-cp-muted hover:text-foreground"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedPublishableCount === 0 || bulkPublish.isPending}
                  className="h-8 border-emerald-500/30 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  onClick={() => void handleBulkPublishSelected()}
                >
                  {bulkPublish.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Publish selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    bulkPublish.isPending ||
                    !data?.stats?.wikiDraft ||
                    data.stats.wikiDraft === 0
                  }
                  className="h-8 border-cp-border text-xs text-cp-muted hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400"
                  onClick={() => void handleBulkPublishAllDrafts()}
                >
                  Publish all drafts
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedDeletableCount === 0 || bulkDelete.isPending}
                  className="h-8 border-red-500/30 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => void handleBulkDeleteSelected()}
                >
                  {bulkDelete.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Delete selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    bulkDelete.isPending ||
                    estimatedDeletableTotal === 0 ||
                    estimatedDeletableTotal === null
                  }
                  title={
                    estimatedDeletableTotal === 0
                      ? "No deletable items match your filters (live tournaments are skipped)"
                      : undefined
                  }
                  className="h-8 border-cp-border text-xs text-cp-muted hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => void handleBulkDeleteAll()}
                >
                  Delete all
                </Button>
              </div>
            </div>
          ) : null}

          {isError ? (
            <div className="space-y-3 p-10 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load entities. Try again."}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-cp-elevated" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-cp-muted">
                {typeFilter === "tournament"
                  ? "No tournaments yet. Create your first tournament."
                  : "No entities yet. Create your first wiki entry."}
              </p>
              <Button asChild size="sm" className="bg-cp-primary">
                <Link href={adminRoutes.wikiEntitiesNew}>Create entity</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cp-border/80 bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                      <th className="w-10 px-3 py-3">
                        <SelectAllCheckbox
                          aria-label="Select all on this page"
                          checked={allPageSelected}
                          indeterminate={somePageSelected && !allPageSelected}
                          disabled={selectableOnPage.length === 0}
                          onChange={toggleSelectAllPage}
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">Entity</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="hidden px-4 py-3 font-semibold xl:table-cell">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cp-border/50">
                    {data.items.map((item) => {
                      const itemKey = getWikiDirectoryItemKey(item);
                      const isSelected = selection.has(itemKey);
                      const selectable = canSelectItem(item);

                      return (
                      <tr
                        key={itemKey}
                        className={cn(
                          "transition-colors hover:bg-cp-elevated/30",
                          isSelected && "bg-cp-primary/5",
                        )}
                      >
                        <td className="w-10 px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.displayName}`}
                            checked={isSelected}
                            disabled={!selectable}
                            title={getBulkDeleteBlockedReason(item) ?? undefined}
                            onChange={() => toggleSelectItem(item)}
                            className={checkboxClass}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <DirectoryEntityIdentity item={item} />
                        </td>
                        <td className="px-4 py-3 text-cp-muted">
                          {getDirectoryTypeLabel(item)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              "border-0 text-[10px] font-semibold uppercase",
                              getDirectoryStatusClass(item),
                            )}
                          >
                            {getDirectoryStatusLabel(item)}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-cp-muted xl:table-cell">
                          {formatDate(item.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DirectoryRowActions
                            item={item}
                            variant="desktop"
                            onDeleteEntity={(id, name) => void handleDeleteEntity(id, name)}
                            onDeleteTournament={(id, name) => void handleDeleteTournament(id, name)}
                          />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-cp-border/50 lg:hidden">
                {selectableOnPage.length > 0 ? (
                  <div className="flex items-center gap-3 border-b border-cp-border/60 bg-cp-elevated/25 px-3 py-2.5 sm:px-4">
                    <SelectAllCheckbox
                      aria-label="Select all on this page"
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={toggleSelectAllPage}
                    />
                    <span className="text-xs text-cp-muted">Select all on this page</span>
                  </div>
                ) : null}
                {data.items.map((item) => {
                  const itemKey = getWikiDirectoryItemKey(item);
                  const isSelected = selection.has(itemKey);
                  const selectable = canSelectItem(item);

                  return (
                  <article
                    key={itemKey}
                    className={cn("p-3 sm:p-4", isSelected && "bg-cp-primary/5")}
                  >
                    <div className="flex gap-3">
                      {selectable ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.displayName}`}
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item)}
                          className={cn(checkboxClass, "mt-1")}
                        />
                      ) : (
                        <span
                          className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center"
                          title={getBulkDeleteBlockedReason(item) ?? undefined}
                          aria-label={getBulkDeleteBlockedReason(item) ?? "Cannot select"}
                        >
                          <span className="h-3 w-3 rounded border border-cp-border/50 bg-cp-elevated/40" />
                        </span>
                      )}
                      <WikiEntityThumbnail
                        imageUrl={item.primaryImageUrl}
                        entityType={item.entityType}
                        displayName={item.displayName}
                        size="md"
                      />
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {item.displayName}
                            </p>
                            <p className="truncate text-xs text-cp-muted">
                              {getDirectoryTypeLabel(item)} · /{item.slug}
                            </p>
                          </div>
                          <Badge
                            className={cn(
                              "shrink-0 border-0 text-[10px] font-semibold uppercase",
                              getDirectoryStatusClass(item),
                            )}
                          >
                            {getDirectoryStatusLabel(item)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-cp-muted sm:text-xs">
                          Updated {formatDate(item.updatedAt)}
                        </p>
                        <DirectoryRowActions
                          item={item}
                          variant="mobile"
                          onDeleteEntity={(id, name) => void handleDeleteEntity(id, name)}
                          onDeleteTournament={(id, name) => void handleDeleteTournament(id, name)}
                        />
                      </div>
                    </div>
                  </article>
                );
                })}
              </div>
            </>
          )}
        </div>

        {data && data.total > 0 ? (
          <DataTablePagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={totalPages}
            disabled={isFetching}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        ) : null}
      </div>
  );
}
