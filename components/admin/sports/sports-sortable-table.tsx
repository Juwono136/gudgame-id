"use client";

import Image from "next/image";
import Link from "next/link";
import { Reorder } from "framer-motion";
import { ExternalLink, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publicSportRoutes } from "@/lib/constants/routes";
import { resolveUserImageUrl } from "@/lib/media/client";
import type { SportDetail } from "@/lib/sports/service";
import { cn } from "@/lib/utils";

const VISIBILITY_BADGE: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  coming_soon: "bg-amber-500/15 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  hidden: "bg-cp-elevated text-cp-muted",
};

const TABLE_HEAD_CLASS =
  "border-b border-cp-border/80 bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wider text-cp-muted";

type SportsSortableTableProps = {
  items: SportDetail[];
  canReorder: boolean;
  onPageReorder: (orderedPageIds: string[]) => void;
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
  reordering?: boolean;
};

export function SportsSortableTable({
  items,
  canReorder,
  onPageReorder,
  onEdit,
  onDelete,
  reordering,
}: SportsSortableTableProps) {
  if (canReorder) {
    return (
      <>
        <SportsMobileList
          items={items}
          sortable
          reordering={reordering}
          onReorder={(next) => onPageReorder(next.map((s) => s.id))}
          onEdit={onEdit}
          onDelete={onDelete}
        />
        <SportsDesktopSortableTable
          items={items}
          reordering={reordering}
          onReorder={(next) => onPageReorder(next.map((s) => s.id))}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </>
    );
  }

  return (
    <>
      <SportsMobileList
        items={items}
        sortable={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <SportsDesktopStaticTable items={items} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
}

function SportsDesktopSortableTable({
  items,
  reordering,
  onReorder,
  onEdit,
  onDelete,
}: {
  items: SportDetail[];
  reordering?: boolean;
  onReorder: (next: SportDetail[]) => void;
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[640px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-[7.75rem]" />
          <col className="w-[5.75rem]" />
          <col className="w-[7.25rem]" />
        </colgroup>
        <thead>
          <tr className={TABLE_HEAD_CLASS}>
            <th className="px-2 py-3" aria-label="Reorder" />
            <th className="px-4 py-3">Sport</th>
            <th className="px-3 py-3">Visibility</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <Reorder.Group
          as="tbody"
          axis="y"
          values={items}
          onReorder={onReorder}
          className={cn("divide-y divide-cp-border/50", reordering && "opacity-60")}
        >
          {items.map((sport) => (
            <Reorder.Item
              key={sport.id}
              as="tr"
              value={sport}
              dragListener={!reordering}
              className={cn(
                "bg-cp-card/30 transition-colors hover:bg-cp-elevated/40",
                reordering && "pointer-events-none",
              )}
            >
              <td className="px-2 py-3 align-middle">
                <button
                  type="button"
                  className="flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-cp-muted hover:bg-cp-elevated hover:text-foreground active:cursor-grabbing"
                  aria-label={`Reorder ${sport.name}`}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </td>
              <td className="px-4 py-3 align-middle">
                <SportIdentity sport={sport} />
              </td>
              <td className="px-3 py-3 align-middle">
                <VisibilityBadge visibility={sport.visibility} />
              </td>
              <td className="px-3 py-3 align-middle">
                <ActiveBadge active={sport.isActive} />
              </td>
              <td className="px-3 py-3 align-middle text-right">
                <RowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </table>
    </div>
  );
}

function SportsDesktopStaticTable({
  items,
  onEdit,
  onDelete,
}: {
  items: SportDetail[];
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[600px] table-fixed text-left text-sm">
        <colgroup>
          <col />
          <col className="w-[7.75rem]" />
          <col className="w-[5.75rem]" />
          <col className="w-[7.25rem]" />
        </colgroup>
        <thead>
          <tr className={TABLE_HEAD_CLASS}>
            <th className="px-4 py-3">Sport</th>
            <th className="px-3 py-3">Visibility</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cp-border/50">
          {items.map((sport) => (
            <tr
              key={sport.id}
              className="bg-cp-card/30 transition-colors hover:bg-cp-elevated/40"
            >
              <td className="px-4 py-3 align-middle">
                <SportIdentity sport={sport} />
              </td>
              <td className="px-3 py-3 align-middle">
                <VisibilityBadge visibility={sport.visibility} />
              </td>
              <td className="px-3 py-3 align-middle">
                <ActiveBadge active={sport.isActive} />
              </td>
              <td className="px-3 py-3 align-middle text-right">
                <RowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SportsMobileList({
  items,
  sortable,
  reordering,
  onReorder,
  onEdit,
  onDelete,
}: {
  items: SportDetail[];
  sortable: boolean;
  reordering?: boolean;
  onReorder?: (next: SportDetail[]) => void;
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
}) {
  if (sortable && onReorder) {
    return (
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={onReorder}
        className={cn("lg:hidden", reordering && "pointer-events-none opacity-60")}
      >
        {items.map((sport) => (
          <Reorder.Item
            key={sport.id}
            value={sport}
            dragListener={!reordering}
            className="border-b border-cp-border/50 bg-cp-card/30 last:border-b-0"
          >
            <SportMobileCard
              sport={sport}
              sortable
              reordering={reordering}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    );
  }

  return (
    <div className={cn("divide-y divide-cp-border/50 lg:hidden", reordering && "opacity-60")}>
      {items.map((sport) => (
        <SportMobileCard
          key={sport.id}
          sport={sport}
          sortable={false}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function SportMobileCard({
  sport,
  sortable,
  reordering,
  onEdit,
  onDelete,
}: {
  sport: SportDetail;
  sortable: boolean;
  reordering?: boolean;
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
}) {
  return (
    <article className="p-4">
      <div className="flex gap-3">
        {sortable ? (
          <button
            type="button"
            className={cn(
              "mt-1 flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-cp-muted hover:bg-cp-elevated hover:text-foreground active:cursor-grabbing",
              reordering && "pointer-events-none",
            )}
            aria-label={`Reorder ${sport.name}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <SportIdentity sport={sport} />
            <RowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                Visibility
              </p>
              <div className="mt-1">
                <VisibilityBadge visibility={sport.visibility} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                Status
              </p>
              <div className="mt-1">
                <ActiveBadge active={sport.isActive} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SportIdentity({ sport }: { sport: SportDetail }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SportThumb sport={sport} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{sport.name}</p>
        <p className="truncate text-xs text-cp-muted">/{sport.slug}</p>
      </div>
    </div>
  );
}

function SportThumb({ sport }: { sport: SportDetail }) {
  const hero = resolveUserImageUrl(sport.heroImageUrl);
  return (
    <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-elevated">
      {hero ? (
        <Image src={hero} alt="" fill className="object-cover" unoptimized />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-cp-muted">
          —
        </div>
      )}
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap border-0 text-[10px] uppercase",
        VISIBILITY_BADGE[visibility] ?? VISIBILITY_BADGE.hidden,
      )}
    >
      {visibility.replace("_", " ")}
    </Badge>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap border-0 text-[10px]",
        active
          ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "bg-cp-elevated text-cp-muted",
      )}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function RowActions({
  sport,
  onEdit,
  onDelete,
}: {
  sport: SportDetail;
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
}) {
  const showView = sport.visibility === "live";

  return (
    <div className="inline-flex shrink-0 items-center justify-end gap-0.5">
      {showView ? (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Link
            href={publicSportRoutes.sportHub(sport.slug)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${sport.name} public page`}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onEdit(sport)}
        aria-label={`Edit ${sport.name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-500/10 hover:text-red-600"
          onClick={() => onDelete(sport)}
          aria-label={`Delete ${sport.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
      )}
    </div>
  );
}
