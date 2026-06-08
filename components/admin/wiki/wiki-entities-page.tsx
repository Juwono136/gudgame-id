"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
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
import { WIKI_ENTITY_TYPE_LABELS, WIKI_STATUS_LABELS } from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/db/schema/wiki";
import { getPublicWikiPath } from "@/lib/wiki/constants";
import type { WikiEntitiesListQuery } from "@/lib/validations/wiki-entities";
import { cn } from "@/lib/utils";

type WikiEntitiesPageProps = {
  context: AdminSessionContext;
};

export function WikiEntitiesPage({ context }: WikiEntitiesPageProps) {
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<WikiEntityType | "all">("all");
  const [statusFilter, setStatusFilter] =
    useState<WikiEntitiesListQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<WikiEntitiesListQuery["sortBy"]>("updated");
  const [sortDir, setSortDir] = useState<WikiEntitiesListQuery["sortDir"]>("desc");

  const queryParams: WikiEntitiesListQuery = useMemo(
    () => ({
      page,
      pageSize: 12,
      search: debouncedSearch || undefined,
      entityType: typeFilter === "all" ? undefined : typeFilter,
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
          <div>
            <p className="text-sm text-cp-muted">
              Manage players, teams, and gear for{" "}
              <span className="font-semibold capitalize text-cp-logo-accent">
                {context.sportSlug}
              </span>
              . Field schemas adapt per sport.
            </p>
          </div>
          <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
            <Link href={adminRoutes.wikiEntitiesNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create entity
            </Link>
          </Button>
        </div>

        {data?.stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <StatCard label="Players" value={String(data.stats.player)} />
            <StatCard label="Teams" value={String(data.stats.team)} />
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
              setTypeFilter(v as WikiEntityType | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-cp-border bg-cp-card sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="player">Players</SelectItem>
              <SelectItem value="team">Teams</SelectItem>
              <SelectItem value="gear">Gear</SelectItem>
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

        {error ? (
          <p className="text-sm text-red-400">Failed to load entities. Try again.</p>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-cp-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.items.map((item, i) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="overflow-hidden rounded-xl border border-cp-border bg-cp-card"
              >
                <div className="relative aspect-[16/9] bg-cp-elevated">
                  {item.primaryImageUrl ? (
                    <Image
                      src={item.primaryImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-cp-muted">
                      No image
                    </div>
                  )}
                  <Badge
                    className={cn(
                      "absolute left-3 top-3",
                      item.status === "published"
                        ? "bg-emerald-900/80 text-emerald-100"
                        : "bg-cp-elevated text-cp-muted",
                    )}
                  >
                    {WIKI_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {item.displayName}
                      </p>
                      <p className="text-xs text-cp-muted">
                        {WIKI_ENTITY_TYPE_LABELS[item.entityType]} · /{item.slug}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`${adminRoutes.wikiEntities}/${item.id}/edit`}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {item.status === "published" ? (
                          <DropdownMenuItem asChild>
                            <a
                              href={getPublicWikiPath(
                                item.sportSlug,
                                item.entityType,
                                item.slug,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View public page
                            </a>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-red-400"
                          onClick={() => void handleDelete(item.id, item.displayName)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {data && data.items.length === 0 && !isLoading ? (
          <p className="py-12 text-center text-sm text-cp-muted">
            No entities yet. Create your first wiki entry.
          </p>
        ) : null}

        {data && totalPages > 1 ? (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-cp-border"
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-sm text-cp-muted">
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
            </Button>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
