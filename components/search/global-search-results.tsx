"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Newspaper, Package, Swords, Trophy, UserRound } from "lucide-react";
import type { GlobalSearchResult, GlobalSearchResultType } from "@/lib/wiki/global-search";
import {
  GLOBAL_SEARCH_EMPTY_HINT,
  GLOBAL_SEARCH_RESULT_TYPES,
  GLOBAL_SEARCH_TYPE_LABELS,
} from "@/lib/wiki/global-search-types";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  GlobalSearchResultType,
  { label: string; icon: typeof UserRound; accent: string }
> = {
  player: { label: GLOBAL_SEARCH_TYPE_LABELS.player, icon: UserRound, accent: "text-sky-400" },
  gear: { label: GLOBAL_SEARCH_TYPE_LABELS.gear, icon: Package, accent: "text-violet-400" },
  tournament: {
    label: GLOBAL_SEARCH_TYPE_LABELS.tournament,
    icon: Trophy,
    accent: "text-emerald-400",
  },
  news: { label: GLOBAL_SEARCH_TYPE_LABELS.news, icon: Newspaper, accent: "text-amber-400" },
};

function groupResults(results: GlobalSearchResult[]) {
  const groups = Object.fromEntries(
    GLOBAL_SEARCH_RESULT_TYPES.map((type) => [type, [] as GlobalSearchResult[]]),
  ) as Record<GlobalSearchResultType, GlobalSearchResult[]>;

  for (const item of results) {
    groups[item.type].push(item);
  }

  return groups;
}

function formatSubtitle(item: GlobalSearchResult) {
  const sportLabel = item.sportName?.trim();
  const detail = item.subtitle?.trim();
  if (sportLabel && detail) return `${sportLabel} · ${detail}`;
  return sportLabel ?? detail ?? null;
}

function SearchResultRow({
  item,
  compact,
  onNavigate,
}: {
  item: GlobalSearchResult;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const meta = TYPE_META[item.type];
  const subtitle = formatSubtitle(item);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-cp-border hover:bg-cp-elevated/60",
        compact && "py-2",
      )}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-elevated">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
            unoptimized={item.imageUrl.startsWith("http")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-cp-muted">
            <meta.icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-cp-primary">
            {item.title}
          </p>
          {item.sportName ? (
            <span className="hidden shrink-0 rounded-full border border-cp-border/80 bg-cp-elevated/60 px-2 py-0.5 text-[10px] font-semibold text-cp-primary sm:inline">
              {item.sportName}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="truncate text-xs text-cp-muted">{subtitle}</p>
        ) : null}
      </div>
      {!compact ? (
        <span
          className={cn(
            "hidden text-[10px] font-semibold uppercase tracking-wide sm:inline",
            meta.accent,
          )}
        >
          {meta.label.slice(0, -1)}
        </span>
      ) : null}
    </Link>
  );
}

type GlobalSearchResultsProps = {
  results: GlobalSearchResult[];
  query: string;
  isLoading?: boolean;
  isError?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function GlobalSearchResults({
  results,
  query,
  isLoading,
  isError,
  compact,
  onNavigate,
  className,
}: GlobalSearchResultsProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-8 text-sm text-cp-muted",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-foreground">Search unavailable</p>
        <p className="mt-1 text-xs text-cp-muted">Please try again in a moment.</p>
      </div>
    );
  }

  if (query.trim().length < 2) {
    return (
      <div className={cn("px-2 py-6 text-center text-sm text-cp-muted", className)}>
        {GLOBAL_SEARCH_EMPTY_HINT}
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className={cn("px-2 py-8 text-center", className)}>
        <Swords className="mx-auto h-8 w-8 text-cp-muted" />
        <p className="mt-3 text-sm font-medium text-foreground">No results for “{query}”</p>
        <p className="mt-1 text-xs text-cp-muted">
          Try another player, gear brand, tournament, or news keyword.
        </p>
      </div>
    );
  }

  const groups = groupResults(results);

  return (
    <div className={cn("space-y-4", className)}>
      {GLOBAL_SEARCH_RESULT_TYPES.map((type) => {
        const items = groups[type];
        if (!items.length) return null;
        const meta = TYPE_META[type];

        return (
          <section key={type}>
            <div className="mb-1 flex items-center gap-2 px-2">
              <meta.icon className={cn("h-3.5 w-3.5", meta.accent)} />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                {meta.label}
              </h3>
            </div>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <SearchResultRow item={item} compact={compact} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
