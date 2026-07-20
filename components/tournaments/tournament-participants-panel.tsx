"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useRemoveTournamentTeam } from "@/hooks/use-tournament-manage-display";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import { MAX_SEARCH_TERM_LENGTH } from "@/lib/search/sanitize-search-term";
import type { TournamentParticipantRow } from "@/lib/tournaments/participants/query";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 400;

type FunMatchTeamScore = {
  pointsFor: number;
  wins: number;
  losses?: number;
  points?: number;
};

type TournamentParticipantsPanelProps = {
  sportSlug: string;
  slug: string;
  tournamentType: "official" | "fun_match";
  variant?: "official" | "reclub";
  officialBilling?: string | null;
  /** Fun match: squad stats keyed by team id (preferred) or team name */
  teamScoreByName?: Record<string, FunMatchTeamScore>;
  teamScoreByTeamId?: Record<string, FunMatchTeamScore>;
  /** Host manage: allow removing an entire confirmed team */
  canRemoveTeams?: boolean;
};

function formatIdr(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function paymentBadgeVariant(status: string | null): "success" | "warning" | "muted" {
  if (status === "paid" || status === "free") return "success";
  if (status === "pending") return "warning";
  return "muted";
}

function formatRegistrationStatus(status: string | null | undefined) {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

function ParticipantPlayerCell({
  row,
  variant,
  avatarClassName,
  compact = false,
}: {
  row: TournamentParticipantRow;
  variant: "official" | "reclub";
  avatarClassName?: string;
  compact?: boolean;
}) {
  const hoverAccent =
    variant === "official"
      ? "group-hover:text-cp-primary"
      : "group-hover:text-emerald-300";

  const avatar = (
    <Avatar
      className={cn(
        "shrink-0 border border-cp-border",
        avatarClassName ?? (compact ? "h-10 w-10" : "h-11 w-11"),
      )}
    >
      <AvatarImage src={row.image ?? undefined} alt="" />
      <AvatarFallback className="bg-cp-elevated text-xs">
        {initials(row.displayName)}
      </AvatarFallback>
    </Avatar>
  );

  const nameBlock = row.profileUrl ? (
    <Link href={row.profileUrl} className={cn("group block min-w-0", hoverAccent)}>
      <p className="truncate font-semibold text-foreground transition-colors group-hover:text-cp-primary">
        {row.displayName}
      </p>
      {!compact && row.genderLabel ? (
        <p className="mt-0.5 truncate text-xs text-cp-muted">{row.genderLabel}</p>
      ) : null}
    </Link>
  ) : (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{row.displayName}</p>
      {!compact && row.genderLabel ? (
        <p className="mt-0.5 truncate text-xs text-cp-muted">{row.genderLabel}</p>
      ) : null}
    </div>
  );

  const avatarNode = row.profileUrl ? (
    <Link
      href={row.profileUrl}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary"
    >
      {avatar}
    </Link>
  ) : (
    avatar
  );

  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatarNode}
      {nameBlock}
    </div>
  );
}

function OfficialStatusBadges({ row }: { row: TournamentParticipantRow }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:justify-start lg:justify-end">
      <Badge variant="muted" className="capitalize">
        {formatRegistrationStatus(row.registrationStatus)}
      </Badge>
      <Badge variant={paymentBadgeVariant(row.paymentStatus)} className="capitalize">
        <CreditCard className="mr-1 h-3 w-3" />
        {row.paymentStatus ?? "—"}
      </Badge>
      {row.amountIdr != null ? (
        <span className="w-full text-right text-[11px] tabular-nums text-cp-muted sm:w-auto lg:text-right">
          {formatIdr(row.amountIdr)}
        </span>
      ) : null}
    </div>
  );
}

function FunMatchScore({
  row,
  teamScoreByName,
  teamScoreByTeamId,
}: {
  row: TournamentParticipantRow;
  teamScoreByName?: Record<string, FunMatchTeamScore>;
  teamScoreByTeamId?: Record<string, FunMatchTeamScore>;
}) {
  const stat =
    teamScoreByTeamId?.[row.teamId] ??
    (row.teamName ? teamScoreByName?.[row.teamName] : undefined);

  const hasActivity =
    stat &&
    (stat.pointsFor > 0 ||
      stat.wins > 0 ||
      (stat.losses ?? 0) > 0 ||
      (stat.points ?? 0) > 0);

  if (!hasActivity) {
    return <span className="text-sm text-cp-muted">—</span>;
  }

  const rankingPts = stat.points ?? 0;
  const label = rankingPts > 0 ? `${rankingPts} pts` : `${stat.pointsFor} pts`;

  return (
    <span className="text-sm font-semibold tabular-nums text-foreground">
      {label}
      {stat.wins > 0 || (stat.losses ?? 0) > 0 ? (
        <span className="ml-1.5 text-xs font-normal text-cp-muted">
          · {stat.wins}W{(stat.losses ?? 0) > 0 ? `-${stat.losses}L` : ""}
        </span>
      ) : null}
    </span>
  );
}

export function TournamentParticipantsPanel({
  sportSlug,
  slug,
  tournamentType,
  variant = tournamentType === "official" ? "official" : "reclub",
  officialBilling,
  teamScoreByName,
  teamScoreByTeamId,
  canRemoveTeams = false,
}: TournamentParticipantsPanelProps) {
  const { confirm } = useConfirmDialog();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const activeSearch = debouncedSearch.trim();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching, isError, error, refetch, isPlaceholderData } =
    useTournamentParticipants(sportSlug, slug, page, pageSize, {
      search: activeSearch,
    });
  const removeTeam = useRemoveTournamentTeam(sportSlug, slug);

  const isOfficial = tournamentType === "official";
  const isFreeOfficial = officialBilling === "free";
  const accent =
    variant === "official"
      ? "text-emerald-800 dark:text-cp-primary"
      : "text-emerald-700 dark:text-emerald-400";
  const teamAccent =
    variant === "official"
      ? "text-amber-700 dark:text-amber-300/95"
      : "text-emerald-700 dark:text-emerald-300/95";

  const items = data?.items ?? [];
  const firstRowByTeamId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data?.items ?? []) {
      if (!map.has(row.teamId)) {
        map.set(row.teamId, `${row.teamId}-${row.userId}`);
      }
    }
    return map;
  }, [data?.items]);

  const clearSearch = () => {
    setSearchInput("");
    setPage(1);
  };

  const handleRemoveTeam = async (row: TournamentParticipantRow) => {
    if (row.canHardRemove === false) {
      toast.error(
        "This team has already competed. Career statistics and match history are preserved, so the team cannot be removed.",
      );
      return;
    }

    const ok = await confirm({
      title: `Remove ${row.teamName}?`,
      description: isOfficial
        ? "This permanently removes the team and its players from registration. Only teams that have not played any matches can be removed — this keeps player career stats consistent."
        : "This permanently removes the squad and its players from the session. Only squads that have not played any matches can be removed — this keeps player career stats consistent.",
      confirmLabel: "Remove team",
      cancelLabel: "Keep team",
      variant: "destructive",
    });
    if (!ok) return;
    setRemovingTeamId(row.teamId);
    try {
      await removeTeam.mutateAsync(row.teamId);
    } finally {
      setRemovingTeamId(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading players…" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center dark:bg-red-950/20">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500 dark:text-red-400" />
        <p className="mt-3 text-sm text-foreground">Could not load player list</p>
        <p className="mt-1 text-xs text-cp-muted">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-cp-border"
          onClick={() => void refetch()}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const teamCount = data?.teamCount ?? 0;
  const hasActiveSearch = activeSearch.length > 0;
  const showEmptyRoster = total === 0 && !hasActiveSearch;
  const showNoMatches = total === 0 && hasActiveSearch;
  const isSearchPending = searchInput.trim() !== activeSearch;
  const showFetching = (isFetching || isPlaceholderData || isSearchPending) && !isLoading;
  const gridCols = canRemoveTeams
    ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_minmax(0,1fr)_auto]"
    : "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_minmax(0,1.1fr)]";

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className={cn("h-5 w-5 shrink-0", accent)} />
            {isOfficial ? "Registered players" : "Session players"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-cp-muted">
            {isOfficial
              ? isFreeOfficial
                ? "Confirmed teams with completed registration — updated as players finalize their spot."
                : "Confirmed teams with completed payment — updated as registrations are finalized."
              : "Everyone currently in the lobby squads for this Fun Match."}
            {canRemoveTeams
              ? " You can remove a team only if it has not played any matches yet — this keeps player career statistics consistent."
              : null}
          </p>
        </div>

        <div className="relative w-full shrink-0 lg:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-800 dark:text-cp-muted"
            aria-hidden
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.slice(0, MAX_SEARCH_TERM_LENGTH))}
            placeholder="Search player or team…"
            maxLength={MAX_SEARCH_TERM_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-label={isOfficial ? "Search registered players" : "Search session players"}
            className={cn(
              "border-cp-border bg-cp-bg-input pr-10 pl-10 text-foreground placeholder:text-cp-muted",
              // Hide native clear so only our custom X shows.
              "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            )}
          />
          {searchInput ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-cp-muted transition-colors hover:bg-cp-elevated hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-red-950/20">
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">Could not refresh player list</p>
              <p className="mt-0.5 text-xs text-cp-muted">
                {error instanceof Error ? error.message : "Something went wrong"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-cp-border"
            onClick={() => void refetch()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : null}

      {!showEmptyRoster ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {[
            {
              label: hasActiveSearch ? "Matches" : "Players",
              value: String(total),
            },
            {
              label: isOfficial ? "Teams" : "Squads",
              value: String(teamCount),
            },
            {
              label: "Page",
              value: `${page} / ${Math.max(1, data?.totalPages ?? 1)}`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-cp-border/80 bg-cp-elevated/25 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                {stat.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {showFetching ? (
        <p className="flex items-center gap-2 text-xs text-cp-muted" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {hasActiveSearch || isSearchPending ? "Searching…" : "Refreshing…"}
        </p>
      ) : null}

      {showEmptyRoster ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-6 py-14 text-center">
          <UserRound className="mx-auto h-8 w-8 text-cp-muted/70" />
          <p className="mt-3 text-sm text-cp-muted">
            {isOfficial
              ? isFreeOfficial
                ? "Confirmed teams appear here after registration is complete."
                : "Teams appear here after registration and payment are complete."
              : "No players in the lobby yet. Join a squad to get started."}
          </p>
        </div>
      ) : showNoMatches ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-6 py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-cp-muted/70" />
          <p className="mt-3 text-sm font-medium text-foreground">No players match your search</p>
          <p className="mt-1 text-xs text-cp-muted">
            Try another name or team for &ldquo;{activeSearch}&rdquo;.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 border-cp-border"
            onClick={clearSearch}
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card transition-opacity",
            showFetching && "opacity-80",
          )}
        >
          <div
            className={cn(
              "hidden border-b border-cp-border/80 bg-cp-elevated/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted lg:grid lg:gap-4 lg:px-5",
              gridCols,
            )}
          >
            <span>Player</span>
            <span>Team / squad</span>
            <span>Role</span>
            <span className="text-right">{isOfficial ? "Status" : "Score"}</span>
            {canRemoveTeams ? <span className="text-right">Actions</span> : null}
          </div>

          <ul className="divide-y divide-cp-border/70">
            {items.map((row) => {
              const rowKey = `${row.teamId}-${row.userId}`;
              const showTeamAction =
                canRemoveTeams && firstRowByTeamId.get(row.teamId) === rowKey;
              const isRemoving = removingTeamId === row.teamId;

              return (
                <li
                  key={rowKey}
                  className={cn(
                    "p-4 transition-colors hover:bg-cp-elevated/20 lg:grid lg:items-center lg:gap-4 lg:px-5 lg:py-3.5",
                    gridCols,
                  )}
                >
                  <ParticipantPlayerCell row={row} variant={variant} />

                  <div className="mt-3 min-w-0 lg:mt-0">
                    <p className={cn("truncate text-sm font-medium", teamAccent)}>
                      {row.teamName}
                    </p>
                    <p className="mt-0.5 text-xs text-cp-muted lg:hidden">
                      {row.genderLabel ? `${row.genderLabel} · ` : ""}
                      <span className="capitalize">{row.role}</span>
                    </p>
                  </div>

                  <div className="mt-2 hidden lg:block">
                    <Badge variant="muted" className="capitalize">
                      {row.role}
                    </Badge>
                  </div>

                  <div className="mt-3 lg:mt-0">
                    {isOfficial ? (
                      <OfficialStatusBadges row={row} />
                    ) : (
                      <div className="flex items-center justify-between gap-2 lg:justify-end">
                        <span className="text-xs text-cp-muted lg:hidden">Score</span>
                        <FunMatchScore
                          row={row}
                          teamScoreByName={teamScoreByName}
                          teamScoreByTeamId={teamScoreByTeamId}
                        />
                      </div>
                    )}
                  </div>

                  {canRemoveTeams ? (
                    <div className="mt-3 flex justify-end lg:mt-0">
                      {showTeamAction ? (
                        row.canHardRemove === false ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 w-full cursor-not-allowed border-cp-border text-cp-muted sm:w-auto"
                            disabled
                            title="This team has already competed. Career stats are preserved."
                          >
                            <Lock className="mr-1.5 h-3.5 w-3.5" />
                            Locked
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 w-full border-red-300/80 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            disabled={isRemoving || removeTeam.isPending}
                            onClick={() => void handleRemoveTeam(row)}
                          >
                            {isRemoving ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Remove team
                          </Button>
                        )
                      ) : (
                        <span className="hidden text-xs text-cp-muted lg:inline">—</span>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={data?.totalPages ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            disabled={isFetching}
          />
        </div>
      )}
    </section>
  );
}
