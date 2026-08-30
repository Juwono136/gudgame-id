"use client";

import { Fragment } from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uniquePlayerNames } from "@/lib/format/player-names";
import { cn } from "@/lib/utils";

export type TeamPlayerListEntry = {
  displayName?: string | null;
  name?: string | null;
  image?: string | null;
};

export type TeamPlayerListProps = {
  names?: Array<string | TeamPlayerListEntry | null | undefined> | null;
  /** Cap visible rows (schedule board uses 3). */
  maxNames?: number;
  className?: string;
  align?: "left" | "right";
  /** Tighter type for dense tables / bracket slots. */
  compact?: boolean;
  /**
   * `icon` — lucide User (default, dense tables).
   * `avatar` — circular profile photo / initials (leaderboard, venue display).
   */
  variant?: "icon" | "avatar";
  /** Venue TV / dark surfaces. */
  tone?: "default" | "display";
  /** `stack` — one player per row (public Matches tab). `inline` — compact row for TV carousels. */
  layout?: "stack" | "inline";
};

function resolveEntries(
  names: TeamPlayerListProps["names"],
): Array<{ name: string; image: string | null }> {
  if (!names?.length) return [];
  const parsed = names
    .map((entry) => {
      if (typeof entry === "string") {
        const name = entry.trim();
        return name ? { name, image: null as string | null } : null;
      }
      if (entry && typeof entry === "object") {
        const name = (entry.displayName ?? entry.name ?? "").trim();
        if (!name) return null;
        return { name, image: entry.image?.trim() || null };
      }
      return null;
    })
    .filter((e): e is { name: string; image: string | null } => Boolean(e));

  // Dedupe by name while keeping the first image we saw.
  const byName = new Map<string, { name: string; image: string | null }>();
  for (const entry of parsed) {
    const key = entry.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, entry);
    else if (!byName.get(key)!.image && entry.image) {
      byName.set(key, entry);
    }
  }
  // Preserve uniquePlayerNames order preference when images absent for all.
  const ordered = uniquePlayerNames(parsed.map((p) => p.name));
  return ordered.map((name) => byName.get(name.toLowerCase()) ?? { name, image: null });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/**
 * Vertical player roster — shared Match Schedule / Groups / Live / History / display.
 */
export function TeamPlayerList({
  names,
  maxNames = 4,
  className,
  align = "left",
  compact = false,
  variant = "icon",
  tone = "default",
  layout = "stack",
}: TeamPlayerListProps) {
  const list = resolveEntries(names);
  if (!list.length) return null;
  const visible = list.slice(0, maxNames);
  const hidden = list.length - visible.length;
  const isDisplay = tone === "display";
  const useAvatar = variant === "avatar";
  const isInline = layout === "inline";

  const textClass = isDisplay
    ? compact
      ? "text-[9px] text-white/55 sm:text-[10px]"
      : isInline
        ? "text-[10px] text-white/55 sm:text-[11px]"
        : "text-[11px] text-white/60 sm:text-xs"
    : compact
      ? "text-[9px] text-cp-muted sm:text-[10px]"
      : "text-[10px] text-cp-muted sm:text-[11px]";

  if (isInline) {
    return (
      <p
        className={cn(
          "mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug",
          align === "right" && "justify-end",
          textClass,
          className,
        )}
        title={list.map((p) => p.name).join(", ")}
      >
        {visible.map((player, index) => (
          <Fragment key={player.name}>
            {index > 0 ? (
              <span className={isDisplay ? "text-white/20" : "text-cp-muted/40"} aria-hidden>
                ·
              </span>
            ) : null}
            <span className="inline-flex min-w-0 max-w-full items-center gap-1">
              {useAvatar ? (
                <Avatar
                  size="sm"
                  className={cn(
                    "shrink-0 after:border-white/15",
                    compact ? "!size-3.5" : "!size-4",
                    isDisplay && "ring-1 ring-white/20",
                  )}
                >
                  {player.image ? <AvatarImage src={player.image} alt="" /> : null}
                  <AvatarFallback
                    className={cn(
                      "text-[7px] font-semibold",
                      isDisplay ? "bg-white/15 text-white/80" : "bg-cp-elevated text-cp-muted",
                    )}
                  >
                    {initials(player.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User
                  className={cn(
                    "size-2 shrink-0 opacity-70",
                    isDisplay && "text-white/40",
                  )}
                  aria-hidden
                />
              )}
              <span className="min-w-0 break-words">{player.name}</span>
            </span>
          </Fragment>
        ))}
        {hidden > 0 ? (
          <span className={isDisplay ? "text-white/40" : "text-cp-muted/80"}>+{hidden}</span>
        ) : null}
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "mt-0.5 space-y-0.5",
        align === "right" && "flex flex-col items-end",
        className,
      )}
      title={list.map((p) => p.name).join(", ")}
    >
      {visible.map((player) => (
        <li
          key={player.name}
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            align === "right" && "justify-end",
            textClass,
          )}
        >
          {useAvatar ? (
            <Avatar
              size="sm"
              className={cn(
                "shrink-0 after:border-white/15",
                compact ? "!size-4" : isDisplay ? "!size-5 sm:!size-6" : "!size-5",
                isDisplay && "ring-1 ring-white/20",
              )}
            >
              {player.image ? (
                <AvatarImage src={player.image} alt="" />
              ) : null}
              <AvatarFallback
                className={cn(
                  "text-[8px] font-semibold",
                  isDisplay
                    ? "bg-white/15 text-white/80"
                    : "bg-cp-elevated text-cp-muted",
                  compact && "text-[7px]",
                )}
              >
                {initials(player.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User
              className={cn(
                "shrink-0 opacity-70",
                compact ? "h-2 w-2" : "h-2.5 w-2.5",
                isDisplay && "text-white/40",
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "min-w-0 break-words leading-snug",
              isDisplay ? "text-white/60" : "truncate",
            )}
          >
            {player.name}
          </span>
        </li>
      ))}
      {hidden > 0 ? (
        <li
          className={cn(
            align === "right" && "text-right",
            isDisplay
              ? "text-white/40"
              : "text-cp-muted/80",
            compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          +{hidden} more
        </li>
      ) : null}
    </ul>
  );
}

/** Overlapping avatars for a team/player row (leaderboard entity column). */
export function TeamAvatarStack({
  members,
  max = 3,
  className,
  tone = "default",
}: {
  members?: Array<{ name: string; image?: string | null }> | null;
  max?: number;
  className?: string;
  tone?: "default" | "display";
}) {
  const list = (members ?? []).filter((m) => m.name.trim());
  if (!list.length) {
    return (
      <Avatar
        size="sm"
        className={cn(
          "!size-7 shrink-0",
          tone === "display" && "ring-1 ring-white/20 after:border-white/15",
          className,
        )}
      >
        <AvatarFallback
          className={cn(
            "text-[9px] font-semibold",
            tone === "display" ? "bg-white/15 text-white/70" : "bg-cp-elevated text-cp-muted",
          )}
        >
          <User className="size-3.5 opacity-70" aria-hidden />
        </AvatarFallback>
      </Avatar>
    );
  }

  const visible = list.slice(0, max);
  const extra = list.length - visible.length;
  const isDisplay = tone === "display";

  return (
    <div
      className={cn("flex shrink-0 -space-x-1.5", className)}
      aria-hidden={list.length > 1}
    >
      {visible.map((m) => (
        <Avatar
          key={m.name}
          size="sm"
          className={cn(
            "!size-7 ring-2",
            isDisplay ? "ring-[#0a1210] after:border-white/15" : "ring-background",
          )}
        >
          {m.image ? <AvatarImage src={m.image} alt="" /> : null}
          <AvatarFallback
            className={cn(
              "text-[9px] font-semibold",
              isDisplay ? "bg-white/15 text-white/80" : "bg-cp-elevated text-cp-muted",
            )}
          >
            {initials(m.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            "relative z-[1] flex !size-7 items-center justify-center rounded-full text-[9px] font-semibold ring-2",
            isDisplay
              ? "bg-white/15 text-white/70 ring-[#0a1210]"
              : "bg-muted text-muted-foreground ring-background",
          )}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
