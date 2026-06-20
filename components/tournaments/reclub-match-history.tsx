"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Clock, Loader2, Search, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  getReclubMatchHistoryKey,
  type ReclubMatchView,
} from "@/lib/tournaments/reclub/types";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function winnerSide(match: ReclubMatchView): "a" | "b" | "draw" | null {
  if (match.status !== "completed") return null;
  const a = match.scoreA ?? 0;
  const b = match.scoreB ?? 0;
  if (a > b) return "a";
  if (b > a) return "b";
  return "draw";
}

function MatchScoreBlock({ match }: { match: ReclubMatchView }) {
  const winner = winnerSide(match);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
      <div
        className={cn(
          "min-w-0 flex-1 text-center sm:max-w-[40%]",
          winner === "a" && "text-emerald-300",
        )}
      >
        <p className="truncate text-sm font-semibold text-foreground">{match.teamAName}</p>
        {match.teamAPlayers.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-cp-muted">{match.teamAPlayers.join(" · ")}</p>
        ) : null}
        <p className="mt-2 text-3xl font-bold tabular-nums">{match.scoreA ?? "–"}</p>
      </div>
      <span className="text-lg font-light text-cp-muted">vs</span>
      <div
        className={cn(
          "min-w-0 flex-1 text-center sm:max-w-[40%]",
          winner === "b" && "text-emerald-300",
        )}
      >
        <p className="truncate text-sm font-semibold text-foreground">{match.teamBName}</p>
        {match.teamBPlayers.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-cp-muted">{match.teamBPlayers.join(" · ")}</p>
        ) : null}
        <p className="mt-2 text-3xl font-bold tabular-nums">{match.scoreB ?? "–"}</p>
      </div>
    </div>
  );
}

export function ReclubMatchCard({
  match,
  compact = false,
}: {
  match: ReclubMatchView;
  compact?: boolean;
}) {
  const isLive = match.status === "in_progress";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-cp-card/80 transition-colors",
        isLive ? "border-amber-500/40 shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]" : "border-cp-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cp-border/80 bg-cp-elevated/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-bold", statusBadgeClass.reclub)}>
            {match.roundLabel ?? `R${match.roundNumber}`}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {match.teamAName} vs {match.teamBName}
            </p>
            <p className="text-xs text-cp-muted">{formatWhen(match.endedAt ?? match.startedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!compact && match.durationSeconds != null ? (
            <span className="inline-flex items-center gap-1 text-xs text-cp-muted">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(match.durationSeconds)}
            </span>
          ) : null}
          <Badge
            className={cn(
              "border-0 text-[10px] uppercase",
              isLive
                ? "bg-amber-500/20 text-amber-300"
                : "bg-cp-elevated text-cp-muted",
            )}
          >
            {match.status.replace("_", " ")}
          </Badge>
        </div>
      </div>
      <div className={cn("px-4", compact ? "py-4" : "py-6")}>
        <MatchScoreBlock match={match} />
        {!compact && match.scoreEvents.length > 0 ? (
          <details className="mt-4 rounded-xl border border-cp-border/60 bg-cp-elevated/30 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-cp-muted">
              Score log ({match.scoreEvents.length} updates)
            </summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-cp-muted">
              {[...match.scoreEvents].reverse().slice(0, 12).map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="flex justify-between gap-2">
                  <span>
                    {ev.scoreA}:{ev.scoreB}
                    {ev.userName ? ` · ${ev.userName}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {new Intl.DateTimeFormat("en", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(ev.at))}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </article>
  );
}

type ReclubMatchHistoryPanelProps = {
  sportSlug: string;
  slug: string;
};

export function ReclubMatchHistoryPanel({
  sportSlug,
  slug,
}: ReclubMatchHistoryPanelProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState<"all" | "completed" | "in_progress">("all");

  const query = useInfiniteQuery({
    queryKey: ["reclub", "matches", sportSlug, slug, debouncedSearch, status],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        pageSize: "8",
        status,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(
        `/api/tournaments/${sportSlug}/${slug}/matches?${params.toString()}`,
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: {
          items: ReclubMatchView[];
          total: number;
          page: number;
          totalPages: number;
        };
      }>(res);
      if (!res.ok) throw new Error("Failed to load match history");
      return json.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Trophy className="h-5 w-5 text-emerald-400" />
            Session history
          </h2>
          <p className="mt-1 text-sm text-cp-muted">
            {total} match{total === 1 ? "" : "es"} recorded
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative min-w-[200px] flex-1 sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search squads…"
              className="h-10 border-cp-border bg-cp-elevated/50 pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as typeof status)}
          >
            <SelectTrigger className="h-10 w-full border-cp-border bg-cp-elevated/50 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rounds</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cp-muted" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-cp-border py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-cp-muted" />
          <p className="mt-3 text-sm text-cp-muted">No matches match your filters yet.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {items.map((m) => (
            <li key={getReclubMatchHistoryKey(m)}>
              <ReclubMatchCard match={m} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage ? (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            className="border-cp-border"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      ) : null}
    </section>
  );
}
