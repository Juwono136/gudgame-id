"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { AdminSessionContext } from "@/lib/admin/types";
import { adminRoutes } from "@/lib/constants/routes";
import {
  getPublicWikiPath,
  WIKI_DIRECTORY_ENTITY_LABELS,
  WIKI_DIRECTORY_TYPE_FILTER_OPTIONS,
  WIKI_STATUS_LABELS,
} from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/db/schema/wiki";
import type { WikiDirectoryListItem } from "@/lib/wiki/directory-types";
import type { WikiDirectoryTypeFilterValue } from "@/lib/wiki/constants";
import type { TournamentStatus } from "@/db/schema/tournaments";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/tournaments/constants";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
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
  if (item.recordKind === "tournament") {
    if (item.status === "live") return "bg-emerald-900/40 text-emerald-200";
    if (item.status === "upcoming") return "bg-cp-primary/15 text-cp-primary";
    return "bg-cp-elevated text-cp-muted";
  }
  return item.status === "published"
    ? "bg-emerald-900/40 text-emerald-200"
    : "bg-cp-elevated text-cp-muted";
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

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Delete wiki entity?",
      description: `"${name}" will be permanently removed including media and relations.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (ok) deleteEntity.mutate(id);
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <AdminShell context={context} title="Wiki Entities">
      <div className="relative space-y-6">
        <AdminLoadingOverlay show={isFetching && !isLoading} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-cp-muted">
            Manage players, gear, and tournaments for{" "}
            <span className="font-semibold capitalize text-cp-logo-accent">
              {context.sportSlug}
            </span>
            . Field schemas adapt per sport.
          </p>
          <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
            <Link href={adminRoutes.wikiEntitiesNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create entity
            </Link>
          </Button>
        </div>

        {data?.stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Players" value={String(data.stats.player)} />
            <StatCard label="Tournaments" value={String(data.stats.tournaments)} />
            <StatCard label="Gear" value={String(data.stats.gear)} />
            <StatCard label="Published" value={String(data.stats.published)} />
            <StatCard label="Drafts" value={String(data.stats.draft)} />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search wiki database…"
              className="border-cp-border bg-cp-card pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as WikiDirectoryTypeFilterValue);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-cp-border bg-cp-card sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {WIKI_DIRECTORY_TYPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
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
            <SelectTrigger className="w-full border-cp-border bg-cp-card sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
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
            <SelectTrigger className="w-full border-cp-border bg-cp-card sm:w-[200px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated-desc">Recently updated</SelectItem>
              <SelectItem value="updated-asc">Oldest updated</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
              <SelectItem value="created-desc">Newest created</SelectItem>
              <SelectItem value="created-asc">Oldest created</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card/50 shadow-sm">
          {error ? (
            <p className="p-10 text-center text-sm text-red-400">
              Failed to load entities. Try again.
            </p>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl bg-cp-elevated" />
              ))}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cp-border/80 bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                      <th className="px-4 py-3 font-semibold">Entity</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cp-border/50">
                    {data?.items.map((item, i) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="transition-colors hover:bg-cp-elevated/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-elevated">
                              {item.primaryImageUrl ? (
                                <Image
                                  src={item.primaryImageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-cp-muted">
                                  —
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {item.displayName}
                              </p>
                              <p className="truncate text-xs text-cp-muted">/{item.slug}</p>
                            </div>
                          </div>
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
                        <td className="px-4 py-3 text-cp-muted">
                          {formatDate(item.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.recordKind === "wiki_entity" ? (
                                <DropdownMenuItem asChild>
                                  <Link href={`${adminRoutes.wikiEntities}/${item.id}/edit`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              ) : null}
                              {canViewPublic(item) ? (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={getPublicHref(item)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View public page
                                  </a>
                                </DropdownMenuItem>
                              ) : null}
                              {item.recordKind === "wiki_entity" ? (
                                <DropdownMenuItem
                                  className="text-red-400"
                                  onClick={() => void handleDelete(item.id, item.displayName)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-cp-border/50 lg:hidden">
                {data?.items.map((item, i) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-3 p-4"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-elevated">
                      {item.primaryImageUrl ? (
                        <Image
                          src={item.primaryImageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{item.displayName}</p>
                          <p className="text-xs text-cp-muted">
                            {getDirectoryTypeLabel(item)} · /{item.slug}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "shrink-0 border-0 text-[10px]",
                            getDirectoryStatusClass(item),
                          )}
                        >
                          {getDirectoryStatusLabel(item)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.recordKind === "wiki_entity" ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 border-cp-border"
                          >
                            <Link href={`${adminRoutes.wikiEntities}/${item.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                        ) : null}
                        {canViewPublic(item) ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 border-cp-border"
                          >
                            <a
                              href={getPublicHref(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          </Button>
                        ) : null}
                        {item.recordKind === "wiki_entity" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-400"
                            onClick={() => void handleDelete(item.id, item.displayName)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {data && data.items.length === 0 ? (
                <p className="py-16 text-center text-sm text-cp-muted">
                  {typeFilter === "tournament"
                    ? "No tournaments yet. Create your first tournament."
                    : "No entities yet. Create your first wiki entry."}
                </p>
              ) : null}
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
