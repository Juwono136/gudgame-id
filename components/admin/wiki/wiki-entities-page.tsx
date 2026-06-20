"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { StatCard } from "@/components/admin/ui/stat-card";
import { AdminLoadingOverlay } from "@/components/admin/ui/admin-loading-overlay";
import { WikiEntityThumbnail } from "@/components/admin/wiki/wiki-entity-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useWikiEntitiesList, useDeleteWikiEntity } from "@/hooks/use-wiki-entities";
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
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<WikiDirectoryTypeFilterValue>("all");
  const [statusFilter, setStatusFilter] =
    useState<WikiEntitiesListQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<WikiEntitiesListQuery["sortBy"]>("updated");
  const [sortDir, setSortDir] = useState<WikiEntitiesListQuery["sortDir"]>("desc");

  const queryParams: WikiEntitiesListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      entityType:
        typeFilter === "all"
          ? undefined
          : (typeFilter as WikiEntitiesListQuery["entityType"]),
      status: statusFilter,
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, typeFilter, statusFilter, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = useWikiEntitiesList(queryParams);
  const deleteEntity = useDeleteWikiEntity();
  const deleteTournament = useDeleteAdminTournament();

  const handleDeleteEntity = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete wiki entity?",
      description: `"${name}" will be permanently removed including media and relations.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (ok) deleteEntity.mutate(id);
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

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <AdminShell context={context} title="Wiki Entities">
      <div className="relative space-y-4 sm:space-y-6">
        <AdminLoadingOverlay show={isFetching && !isLoading} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="hidden text-sm text-cp-muted sm:block">
              Manage tournaments, gear, and{" "}
              <span className="font-medium text-foreground">editorial player profiles</span> you
              created for{" "}
              <span className="font-semibold capitalize text-cp-logo-accent">
                {context.sportSlug}
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search wiki database…"
                  className="h-10 w-full border-cp-border bg-cp-elevated/50 pl-10 text-foreground sm:h-11"
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

          {error ? (
            <p className="p-10 text-center text-sm text-red-400">
              Failed to load entities. Try again.
            </p>
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
                      <th className="px-4 py-3 font-semibold">Entity</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="hidden px-4 py-3 font-semibold xl:table-cell">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cp-border/50">
                    {data.items.map((item) => (
                      <tr
                        key={getWikiDirectoryItemKey(item)}
                        className="transition-colors hover:bg-cp-elevated/30"
                      >
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
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-cp-border/50 lg:hidden">
                {data.items.map((item) => (
                  <article key={getWikiDirectoryItemKey(item)} className="p-3 sm:p-4">
                    <div className="flex gap-3">
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
                ))}
              </div>
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
    </AdminShell>
  );
}
