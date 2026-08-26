"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Trash2, TrendingUp, Users } from "lucide-react";
import { CompetitionListPagination } from "@/components/dashboard/player/competition/competition-list-pagination";
import { CompetitionListSkeleton } from "@/components/dashboard/player/competition/competition-list-loading";
import { PartnerDirectoryToolbar } from "@/components/partners/partner-directory-toolbar";
import {
  PartnerEditPlayerButton,
  PartnerEditPlayerDialog,
} from "@/components/partners/partner-edit-player-dialog";
import { PartnerEmptyState } from "@/components/partners/partner-empty-state";
import {
  PartnerListFetchingOverlay,
  PartnerLoadingOverlay,
} from "@/components/partners/partner-loading";
import { PartnerPublicEligibilitySearch } from "@/components/partners/partner-public-eligibility-search";
import { Button } from "@/components/ui/button";
import { useArchivePartnerPlayer } from "@/hooks/use-archive-partner-player";
import { useDebounce } from "@/hooks/use-debounce";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import type { PartnerPlayersListQuery } from "@/lib/partners/list-query";
import type { PartnerPlayerListItem } from "@/lib/partners/player-stats";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import { cn } from "@/lib/utils";

type ListResponse = {
  items: PartnerPlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PartnerPlayersDirectoryProps = {
  partnerSlug: string;
  partnerName: string;
  className?: string;
};

const SORT_OPTIONS = [
  { value: "matchesPlayed", label: "Most matches" },
  { value: "wins", label: "Most wins" },
  { value: "winRate", label: "Win rate" },
  { value: "name", label: "Name" },
];

function formatWinRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${rate}%`;
}

function PlayerAvatar({ player }: { player: PartnerPlayerListItem }) {
  const initial = (player.fullName?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cp-border bg-cp-elevated text-sm font-bold text-cp-primary sm:h-12 sm:w-12">
      {player.avatarUrl ? (
        <Image src={player.avatarUrl} alt="" fill className="object-cover" unoptimized />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}

export function PartnerPlayersDirectory({
  partnerSlug,
  partnerName,
  className,
}: PartnerPlayersDirectoryProps) {
  const [tab, setTab] = useState<"players" | "history">("players");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<PartnerPlayersListQuery["sortBy"]>("matchesPlayed");
  const [sortDir, setSortDir] =
    useState<PartnerPlayersListQuery["sortDir"]>("desc");
  const { archivePlayer, isPending: deleting } = useArchivePartnerPlayer();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PartnerPlayerListItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortDir]);

  const query = useMemo(
    (): PartnerPlayersListQuery => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["partner-players", partnerSlug, query],
    enabled: tab === "players",
    queryFn: async (): Promise<ListResponse> => {
      const params = new URLSearchParams();
      params.set("page", String(query.page));
      params.set("pageSize", String(query.pageSize));
      if (query.search) params.set("search", query.search);
      params.set("sortBy", query.sortBy);
      params.set("sortDir", query.sortDir);

      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/players?${params}`,
      );
      const json = await parseJsonResponse<{ success: true; data: ListResponse }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not load players",
        );
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
    refetchInterval: tab === "players" ? 12_000 : false,
    refetchOnWindowFocus: true,
  });

  const handleDelete = async (player: PartnerPlayerListItem) => {
    setDeletingId(player.id);
    try {
      await archivePlayer({
        partnerSlug,
        playerId: player.id,
        playerName: player.fullName,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className={cn("space-y-5", className)}>
      <p className="text-xs font-medium text-cp-muted">
        Staff-only · Partner console data for {partnerName}. Not shown to public visitors.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cp-primary/12 text-cp-primary">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Players list
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cp-muted">
            Internal roster for {partnerName} — profile photo, name, wins, losses, and win rate.
            Stats refresh automatically from completed tournament matches.
          </p>
        </div>
      </div>

      <PartnerLoadingOverlay
        show={deleting}
        label="Removing player…"
        variant="fullscreen"
      />
      <PartnerEditPlayerDialog
        partnerSlug={partnerSlug}
        player={editingPlayer}
        open={Boolean(editingPlayer)}
        onOpenChange={(open) => {
          if (!open) setEditingPlayer(null);
        }}
      />

      <div
        className="inline-flex rounded-full border border-cp-border bg-cp-elevated/40 p-1"
        role="tablist"
        aria-label="Players views"
      >
        {(
          [
            ["players", "Players list"],
            ["history", "Tournament history"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
              tab === id
                ? "bg-cp-primary text-white"
                : "text-cp-muted hover:bg-cp-elevated hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <PartnerPublicEligibilitySearch
          partnerSlug={partnerSlug}
          partnerName={partnerName}
          embedded
        />
      ) : (
        <>
          <PartnerDirectoryToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search player name, email, or phone…"
            sortBy={sortBy}
            onSortByChange={(v) => setSortBy(v as PartnerPlayersListQuery["sortBy"])}
            sortOptions={SORT_OPTIONS}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
          />

          <div className="relative min-h-[12rem]">
            {isFetching && !isLoading ? <PartnerListFetchingOverlay /> : null}

            {isLoading && !data ? (
              <CompetitionListSkeleton />
            ) : isError ? (
              <p className="rounded-2xl border border-destructive/30 bg-cp-card px-4 py-8 text-center text-sm text-destructive">
                {error instanceof Error ? error.message : "Could not load players."}
              </p>
            ) : items.length === 0 ? (
              <PartnerEmptyState
                icon={Users}
                title={debouncedSearch.trim() ? "No players match your search" : "No players yet"}
                description={
                  debouncedSearch.trim()
                    ? "Try another name or clear the search."
                    : "Players appear here after they register or compete in your partner tournaments. Match results update wins and losses automatically."
                }
              />
            ) : (
              <>
                {/* Mobile cards */}
                <ul className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border bg-cp-card lg:hidden">
                  {items.map((player) => {
                    const href = partnerPublicRoutes.player(partnerSlug, player.id);
                    const rowBusy = deleting && deletingId === player.id;
                    return (
                      <li key={player.id} className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Link
                            href={href}
                            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-95"
                          >
                            <PlayerAvatar player={player} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-foreground">
                                {player.fullName}
                              </p>
                              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-cp-muted">
                                <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
                                  {player.wins}W
                                </span>
                                <span className="tabular-nums text-rose-700 dark:text-rose-300">
                                  {player.losses}L
                                </span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <TrendingUp className="h-3 w-3" aria-hidden />
                                  {formatWinRate(player.winRate)}
                                </span>
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
                          </Link>
                          <PartnerEditPlayerButton
                            disabled={deleting}
                            onClick={() => setEditingPlayer(player)}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 shrink-0 border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            disabled={deleting}
                            aria-label={`Remove ${player.fullName}`}
                            onClick={() => void handleDelete(player)}
                          >
                            {rowBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-2xl border border-cp-border bg-cp-card lg:block">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b border-cp-border bg-cp-elevated/40 text-[11px] uppercase tracking-wider text-cp-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Player</th>
                        <th className="px-4 py-3 font-semibold tabular-nums">Wins</th>
                        <th className="px-4 py-3 font-semibold tabular-nums">Losses</th>
                        <th className="px-4 py-3 font-semibold tabular-nums">Win rate</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cp-border">
                      {items.map((player) => {
                        const href = partnerPublicRoutes.player(partnerSlug, player.id);
                        const rowBusy = deleting && deletingId === player.id;
                        return (
                          <tr
                            key={player.id}
                            className="transition-colors hover:bg-cp-elevated/30"
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={href}
                                className="flex min-w-0 items-center gap-3 hover:opacity-95"
                              >
                                <PlayerAvatar player={player} />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-foreground">
                                    {player.fullName}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-cp-muted">
                                    {player.matchesPlayed} match
                                    {player.matchesPlayed === 1 ? "" : "es"}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                              {player.wins}
                            </td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                              {player.losses}
                            </td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                              {formatWinRate(player.winRate)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={href}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-cp-primary hover:underline"
                                >
                                  View
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                </Link>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs"
                                  disabled={deleting}
                                  onClick={() => setEditingPlayer(player)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-red-500/30 px-2.5 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                  disabled={deleting}
                                  onClick={() => void handleDelete(player)}
                                >
                                  {rowBusy ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Remove
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {totalPages > 1 ? (
            <CompetitionListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={DEFAULT_PAGE_SIZE}
              onPageChange={setPage}
              disabled={isFetching}
            />
          ) : null}
        </>
      )}
    </div>
  );
}