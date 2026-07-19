"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, Loader2, Search, Swords, Trophy } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  formatMatchPlayedAt,
  formatMatchResultLabel,
  formatPlayerTournamentResult,
  formatTournamentStatusLabel,
} from "@/lib/account/player-competition/format-outcome";
import type {
  PaginatedListResult,
  PlayerMatchListItem,
  PlayerTournamentListItem,
} from "@/lib/account/player-competition/types";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HistoryKind = "matches" | "tournaments";

type PlayerHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: HistoryKind;
  playerName: string;
  /** Public wiki player page */
  sportSlug: string;
  playerSlug: string;
};

type ApiSuccess<T> = { success: true; data: T };

const PAGE_SIZE = 15;

function buildPublicUrl(
  kind: HistoryKind,
  sportSlug: string,
  playerSlug: string,
  page: number,
  search: string,
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sortDir: "desc",
  });
  if (search.trim()) params.set("search", search.trim());
  if (kind === "matches") {
    params.set("sortBy", "playedAt");
    params.set("result", "all");
    params.set("type", "all");
  } else {
    params.set("sortBy", "year");
    params.set("scope", "all");
    params.set("type", "all");
  }
  return `/api/public/sports/${sportSlug}/players/${playerSlug}/${kind}?${params}`;
}

function tournamentPublicHref(
  sportSlug: string | null | undefined,
  tournamentSlug: string | null | undefined,
): string | null {
  if (!sportSlug?.trim() || !tournamentSlug?.trim()) return null;
  return publicSportRoutes.tournament(sportSlug, tournamentSlug);
}

function HistoryRowShell({
  href,
  onNavigate,
  children,
  ariaLabel,
}: {
  href: string | null;
  onNavigate: () => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  const className = cn(
    "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3.5 text-left transition-colors sm:px-4",
    href
      ? "cursor-pointer hover:bg-cp-elevated/70 focus-visible:bg-cp-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/40"
      : "cursor-default",
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel} onClick={onNavigate}>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">{children}</div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cp-muted" aria-hidden />
      </Link>
    );
  }

  return (
    <div className={className} aria-label={ariaLabel}>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">{children}</div>
    </div>
  );
}

export function PlayerHistoryDialog({
  open,
  onOpenChange,
  kind,
  playerName,
  sportSlug,
  playerSlug,
}: PlayerHistoryDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const query = useInfiniteQuery({
    queryKey: ["public-player-history", kind, sportSlug, playerSlug, debouncedSearch],
    enabled: open && Boolean(sportSlug && playerSlug),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        buildPublicUrl(kind, sportSlug, playerSlug, pageParam, debouncedSearch),
      );
      const json = await parseJsonResponse<
        ApiSuccess<PaginatedListResult<PlayerMatchListItem | PlayerTournamentListItem>>
      >(res);
      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        throw new Error(
          err.error?.message ??
            (kind === "matches"
              ? "Failed to load matches"
              : "Failed to load tournament history"),
        );
      }
      return json.data;
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  useEffect(() => {
    if (!open || !sentinelRef.current) return;
    const node = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const closeDialog = () => onOpenChange(false);

  const title = kind === "matches" ? "Match history" : "Tournament history";
  const description =
    kind === "matches"
      ? `All recorded matches for ${playerName}`
      : `Tournaments ${playerName} has joined, hosted, or completed`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,760px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b border-cp-border px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            {kind === "matches" ? (
              <Swords className="h-5 w-5 text-cp-primary" />
            ) : (
              <Trophy className="h-5 w-5 text-cp-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="border-b border-cp-border px-5 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                kind === "matches"
                  ? "Search tournament, opponents, round…"
                  : "Search tournament, result, category…"
              }
              className="h-10 border-cp-border bg-cp-elevated/40 pl-9"
              aria-label="Search history"
            />
          </div>
          <p className="mt-2 text-xs text-cp-muted">
            {query.isFetching && !query.isFetchingNextPage
              ? "Searching…"
              : `${total.toLocaleString("en-US")} result${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
          {query.isError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-foreground">
                {query.error instanceof Error
                  ? query.error.message
                  : "Something went wrong"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-cp-border"
                onClick={() => void query.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : query.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-cp-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
              {kind === "matches" ? (
                <Swords className="h-8 w-8 text-cp-text-dim" />
              ) : (
                <Trophy className="h-8 w-8 text-cp-text-dim" />
              )}
              <p className="text-sm font-medium text-foreground">No results found</p>
              <p className="max-w-sm text-xs text-cp-muted">
                {debouncedSearch
                  ? "Try a different search term."
                  : kind === "matches"
                    ? "Match history will appear after this player competes."
                    : "Tournament history will appear after this player joins events."}
              </p>
            </div>
          ) : kind === "matches" ? (
            <ul className="divide-y divide-cp-border/80">
              {(items as PlayerMatchListItem[]).map((match) => {
                const href = tournamentPublicHref(match.sportSlug, match.tournamentSlug);
                return (
                  <li key={match.id}>
                    <HistoryRowShell
                      href={href}
                      onNavigate={closeDialog}
                      ariaLabel={`Open tournament ${match.tournamentName}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {match.tournamentName}
                        </p>
                        <p className="mt-0.5 text-xs text-cp-muted">
                          {formatMatchPlayedAt(match.playedAt)}
                          {match.round ? ` · ${match.round}` : ""}
                          {match.tournamentType === "official" ? " · Official" : " · Fun Match"}
                        </p>
                        {match.opponents ? (
                          <p className="mt-1 truncate text-xs text-cp-muted sm:text-sm">
                            vs {match.opponents}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                          match.resultType === "win"
                            ? "bg-cp-primary/15 text-cp-primary"
                            : "bg-red-500/15 text-red-400",
                        )}
                      >
                        {formatMatchResultLabel(match)}
                      </span>
                    </HistoryRowShell>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-cp-border/80">
              {(items as PlayerTournamentListItem[]).map((row) => {
                const result = formatPlayerTournamentResult(row);
                const status = formatTournamentStatusLabel(row.status);
                const href = tournamentPublicHref(row.sportSlug, row.slug);
                return (
                  <li key={row.id}>
                    <HistoryRowShell
                      href={href}
                      onNavigate={closeDialog}
                      ariaLabel={`Open tournament ${row.tournamentName}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.tournamentName}
                        </p>
                        <p className="mt-0.5 text-xs text-cp-muted">
                          {row.year}
                          {row.category ? ` · ${row.category}` : ""}
                          {row.source === "official" ? " · Official" : " · Fun Match"}
                          {status ? ` · ${status}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex max-w-[40%] shrink-0 truncate rounded-full bg-cp-primary/15 px-2.5 py-1 text-xs font-semibold text-cp-primary">
                        {result}
                      </span>
                    </HistoryRowShell>
                  </li>
                );
              })}
            </ul>
          )}

          <div ref={sentinelRef} className="h-4" aria-hidden />

          {query.isFetchingNextPage ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-cp-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading more…
            </div>
          ) : null}

          {!query.hasNextPage && items.length > 0 ? (
            <p className="py-4 text-center text-xs text-cp-text-dim">End of list</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
