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
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

const VISIBILITY_BADGE: Record<string, string> = {
  live: statusBadgeClass.success,
  coming_soon: statusBadgeClass.warning,
  hidden: statusBadgeClass.muted,
};

const TABLE_HEAD_CLASS =
  "border-b border-cp-border/80 bg-cp-elevated/40 px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:px-4";

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
  return (
    <>
      <SportsMobileList
        items={items}
        sortable={canReorder}
        reordering={reordering}
        onReorder={canReorder ? (next) => onPageReorder(next.map((s) => s.id)) : undefined}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <SportsDesktopTable
        items={items}
        sortable={canReorder}
        reordering={reordering}
        onReorder={canReorder ? (next) => onPageReorder(next.map((s) => s.id)) : undefined}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}

function SportsDesktopTable({
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
  const head = (
    <thead>
      <tr className={TABLE_HEAD_CLASS}>
        {sortable ? <th className="w-10 px-2" aria-label="Reorder" /> : null}
        <th className="min-w-[10rem]">Sport</th>
        <th className="w-[6.5rem] whitespace-nowrap">Visibility</th>
        <th className="w-[5.5rem] whitespace-nowrap">Status</th>
        <th className="hidden w-[8.5rem] whitespace-nowrap xl:table-cell">Updated</th>
        <th className="w-[7.5rem] text-right">Actions</th>
      </tr>
    </thead>
  );

  const rowClass = cn(
    "bg-cp-card/30 transition-colors hover:bg-cp-elevated/40",
    reordering && "pointer-events-none",
  );

  const renderCells = (sport: SportDetail) => (
    <>
      <td className="px-3 py-3 align-middle sm:px-4">
        <SportIdentity sport={sport} showMeta />
      </td>
      <td className="px-3 py-3 align-middle">
        <VisibilityBadge visibility={sport.visibility} />
      </td>
      <td className="px-3 py-3 align-middle">
        <ActiveBadge active={sport.isActive} />
      </td>
      <td className="hidden px-3 py-3 align-middle text-xs text-cp-muted xl:table-cell">
        {formatUpdatedAt(sport.updatedAt)}
      </td>
      <td className="px-3 py-3 align-middle text-right">
        <RowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </>
  );

  return (
    <div
      className={cn(
        "hidden lg:block",
        reordering && "opacity-60",
      )}
    >
      <table className="w-full text-left text-sm">
        {head}
        {sortable && onReorder ? (
          <Reorder.Group as="tbody" axis="y" values={items} onReorder={onReorder}>
            {items.map((sport) => (
              <Reorder.Item key={sport.id} as="tr" value={sport} dragListener={!reordering} className={rowClass}>
                <td className="px-2 py-3 align-middle">
                  <DragHandle name={sport.name} disabled={reordering} />
                </td>
                {renderCells(sport)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <tbody className="divide-y divide-cp-border/50">
            {items.map((sport) => (
              <tr key={sport.id} className={rowClass}>
                {renderCells(sport)}
              </tr>
            ))}
          </tbody>
        )}
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
        className={cn("divide-y divide-cp-border/50 lg:hidden", reordering && "pointer-events-none opacity-60")}
      >
        {items.map((sport) => (
          <Reorder.Item
            key={sport.id}
            value={sport}
            dragListener={!reordering}
            className="bg-cp-card/30"
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
    <article className="p-3 sm:p-4">
      <div className="flex gap-2 sm:gap-3">
        {sortable ? (
          <DragHandle name={sport.name} disabled={reordering} className="self-center" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-2.5">
          <SportIdentity sport={sport} />
          <div className="flex flex-wrap items-center gap-1.5">
            <VisibilityBadge visibility={sport.visibility} />
            <ActiveBadge active={sport.isActive} />
          </div>
          <SportMetaLine sport={sport} />
          <MobileRowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </article>
  );
}

function DragHandle({
  name,
  disabled,
  className,
}: {
  name: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-cp-muted hover:bg-cp-elevated hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8",
        className,
      )}
      aria-label={`Reorder ${name}`}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function SportIdentity({
  sport,
  showMeta = false,
}: {
  sport: SportDetail;
  showMeta?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SportThumb sport={sport} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{sport.name}</p>
        <p className="truncate text-xs text-cp-muted">/{sport.slug}</p>
        {showMeta ? (
          <p className="mt-0.5 text-[10px] leading-relaxed text-cp-muted">
            Order #{sport.displayOrder + 1}
            {sport.heroImageUrl ? " · Hero image" : " · No hero"}
            <span className="hidden lg:inline xl:hidden">
              {" · "}
              {formatUpdatedAt(sport.updatedAt)}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SportThumb({ sport }: { sport: SportDetail }) {
  const hero = resolveUserImageUrl(sport.heroImageUrl);

  return (
    <div className="h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-elevated">
      {hero ? (
        <Image
          src={hero}
          alt=""
          width={72}
          height={48}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-cp-muted">
          No image
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
        active ? statusBadgeClass.success : statusBadgeClass.muted,
      )}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function formatUpdatedAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SportMetaLine({ sport }: { sport: SportDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-cp-muted sm:text-xs">
      <span className="whitespace-nowrap">Order #{sport.displayOrder + 1}</span>
      <span className="text-cp-border" aria-hidden>
        ·
      </span>
      <span className="whitespace-nowrap">
        {sport.heroImageUrl ? "Hero image" : "No hero"}
      </span>
      <span className="text-cp-border" aria-hidden>
        ·
      </span>
      <span>Updated {formatUpdatedAt(sport.updatedAt)}</span>
    </div>
  );
}

function MobileRowActions({
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
    <div className="flex flex-wrap gap-2 pt-0.5">
      {showView ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-10 min-h-10 min-w-[5.5rem] flex-1 border-cp-border px-2 text-xs"
        >
          <Link
            href={publicSportRoutes.sportHub(sport.slug)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${sport.name} public page`}
          >
            <ExternalLink className="mr-1.5 h-4 w-4 shrink-0" />
            View
          </Link>
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="h-10 min-h-10 min-w-[5.5rem] flex-1 border-cp-border px-2 text-xs"
        onClick={() => onEdit(sport)}
        aria-label={`Edit ${sport.name}`}
      >
        <Pencil className="mr-1.5 h-4 w-4 shrink-0" />
        Edit
      </Button>
      {onDelete ? (
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-10 min-w-[5.5rem] flex-1 border-red-500/30 px-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
          onClick={() => onDelete(sport)}
          aria-label={`Delete ${sport.name}`}
        >
          <Trash2 className="mr-1.5 h-4 w-4 shrink-0" />
          Delete
        </Button>
      ) : null}
    </div>
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
