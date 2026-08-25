"use client";

import { User } from "lucide-react";
import { uniquePlayerNames } from "@/lib/format/player-names";
import { cn } from "@/lib/utils";

export type TeamPlayerListProps = {
  names?: Array<string | { displayName?: string | null } | null | undefined> | null;
  /** Cap visible rows (schedule board uses 3). */
  maxNames?: number;
  className?: string;
  align?: "left" | "right";
  /** Tighter type for dense tables / bracket slots. */
  compact?: boolean;
};

function resolveNames(
  names: TeamPlayerListProps["names"],
): string[] {
  if (!names?.length) return [];
  const raw = names.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") return entry.displayName ?? "";
    return "";
  });
  return uniquePlayerNames(raw);
}

/**
 * Vertical player roster with icon — shared Match Schedule / Groups / Live / History style.
 */
export function TeamPlayerList({
  names,
  maxNames = 4,
  className,
  align = "left",
  compact = false,
}: TeamPlayerListProps) {
  const list = resolveNames(names);
  if (!list.length) return null;
  const visible = list.slice(0, maxNames);
  const hidden = list.length - visible.length;

  return (
    <ul
      className={cn(
        "mt-0.5 space-y-0.5",
        align === "right" && "items-end",
        align === "right" && "flex flex-col",
        className,
      )}
      title={list.join(", ")}
    >
      {visible.map((name) => (
        <li
          key={name}
          className={cn(
            "flex min-w-0 items-center gap-1 text-cp-muted",
            align === "right" && "justify-end",
            compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
          )}
        >
          <User
            className={cn(
              "shrink-0 opacity-70",
              compact ? "h-2 w-2" : "h-2.5 w-2.5",
            )}
            aria-hidden
          />
          <span className="truncate">{name}</span>
        </li>
      ))}
      {hidden > 0 ? (
        <li
          className={cn(
            "text-cp-muted/80",
            align === "right" && "text-right",
            compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          +{hidden} more
        </li>
      ) : null}
    </ul>
  );
}
