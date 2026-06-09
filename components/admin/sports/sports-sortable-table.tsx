"use client";

import Image from "next/image";
import Link from "next/link";
import { Reorder } from "framer-motion";
import { ExternalLink, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publicSportRoutes } from "@/lib/constants/routes";
import { resolveUserImageUrl } from "@/lib/storage/media-url";
import type { SportDetail } from "@/lib/sports/service";
import { cn } from "@/lib/utils";

const VISIBILITY_BADGE: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  coming_soon: "bg-amber-500/15 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  hidden: "bg-cp-elevated text-cp-muted",
};

type SportsSortableTableProps = {
  items: SportDetail[];
  canReorder: boolean;
  onPageReorder: (orderedPageIds: number[]) => void;
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
  if (!canReorder) {
    return <StaticTable items={items} onEdit={onEdit} onDelete={onDelete} />;
  }

  return (
    <div className="overflow-hidden">
      <div className="hidden border-b border-cp-border/80 bg-cp-elevated/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] sm:gap-3">
        <span className="w-6" />
        <span>Sport</span>
        <span>Visibility</span>
        <span>Status</span>
        <span className="text-right">Actions</span>
      </div>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(next) => onPageReorder(next.map((s) => s.id))}
        className="divide-y divide-cp-border/50"
      >
        {items.map((sport) => (
          <Reorder.Item
            key={sport.id}
            value={sport}
            dragListener={!reordering}
            className={cn(
              "grid grid-cols-1 items-center gap-3 bg-cp-card/30 px-4 py-3 sm:grid-cols-[auto_1fr_auto_auto_auto]",
              "transition-colors hover:bg-cp-elevated/40",
              reordering && "pointer-events-none opacity-60",
            )}
          >
            <button
              type="button"
              className="hidden cursor-grab touch-none text-cp-muted hover:text-foreground active:cursor-grabbing sm:block"
              aria-label={`Reorder ${sport.name}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="cursor-grab touch-none text-cp-muted sm:hidden"
                aria-hidden
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <SportThumb sport={sport} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{sport.name}</p>
                <p className="text-xs text-cp-muted">/{sport.slug}</p>
              </div>
            </div>
            <VisibilityBadge visibility={sport.visibility} />
            <ActiveBadge active={sport.isActive} />
            <RowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

function StaticTable({
  items,
  onEdit,
  onDelete,
}: {
  items: SportDetail[];
  onEdit: (sport: SportDetail) => void;
  onDelete?: (sport: SportDetail) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-cp-border/80 bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
            <th className="px-4 py-3">Sport</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cp-border/50">
          {items.map((sport) => (
            <tr key={sport.id} className="hover:bg-cp-elevated/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <SportThumb sport={sport} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{sport.name}</p>
                    <p className="text-xs text-cp-muted">/{sport.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <VisibilityBadge visibility={sport.visibility} />
              </td>
              <td className="px-4 py-3">
                <ActiveBadge active={sport.isActive} />
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions sport={sport} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        "w-fit border-0 text-[10px] uppercase",
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
        "w-fit border-0 text-[10px]",
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
  return (
    <div className="flex justify-end gap-0.5">
      {sport.visibility === "live" ? (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Link href={publicSportRoutes.sportHub(sport.slug)} target="_blank">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onEdit(sport)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-500/10 hover:text-red-600"
          onClick={() => onDelete(sport)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
