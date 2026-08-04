"use client";

import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
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
  teamScoreByName?: Record<string, FunMatchTeamScore>;
  teamScoreByTeamId?: Record<string, FunMatchTeamScore>;
  canRemoveTeams?: boolean;
  /** Partner white-label guest registration (not Gud Game squad lobby). */
  partnerEvent?: boolean;
};

type GroupedTeamEntry = {
  teamId: string;
  teamName: string;
  players: TournamentParticipantRow[];
  captain?: TournamentParticipantRow;
  registrationStatus: string | null;
  paymentStatus: string | null;
  amountIdr: number | null;
  canHardRemove: boolean;
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
      {row.genderLabel ? <p className="mt-0.5 truncate text-xs text-cp-muted">{row.genderLabel}</p> : null}
    </Link>
  ) : (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{row.displayName}</p>
      {row.genderLabel ? <p className="mt-0.5 truncate text-xs text-cp-muted">{row.genderLabel}</p> : null}
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
      <div className="min-w-0">
        {nameBlock}
        {compact ? (
          <p className="mt-1 text-[11px] capitalize text-cp-muted">{row.role}</p>
        ) : null}
      </div>
    </div>
  );
}

function OfficialStatusBadges({
  registrationStatus,
  paymentStatus,
  amountIdr,
}: {
  registrationStatus: string | null;
  paymentStatus: string | null;
  amountIdr: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="muted" className="capitalize">
        {formatRegistrationStatus(registrationStatus)}
      </Badge>
      <Badge variant={paymentBadgeVariant(paymentStatus)} className="capitalize">
        <CreditCard className="mr-1 h-3 w-3" />
        {paymentStatus ?? "—"}
      </Badge>
      {amountIdr != null ? (
        <span className="w-full text-[11px] tabular-nums text-cp-muted">{formatIdr(amountIdr)}</span>
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

  if (!hasActivity) return <span className="text-sm text-cp-muted">—</span>;

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

function TeamPlayersList({
  players,
  variant,
  compact = false,
}: {
  players: TournamentParticipantRow[];
  variant: "official" | "reclub";
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={`${player.teamId}-${player.userId}`}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border border-cp-border/70 bg-cp-elevated/10 px-3 py-2",
            compact && "px-2.5",
          )}
        >
          <ParticipantPlayerCell
            row={player}
            variant={variant}
            compact
            avatarClassName={compact ? "h-9 w-9" : undefined}
          />
          <Badge
            variant="muted"
            className={cn("hidden shrink-0 capitalize sm:inline-flex", compact && "text-[11px]")}
          >
            {player.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function TeamStatusCell({
  team,
  isOfficial,
  teamScoreByName,
  teamScoreByTeamId,
}: {
  team: GroupedTeamEntry;
  isOfficial: boolean;
  teamScoreByName?: Record<string, FunMatchTeamScore>;
  teamScoreByTeamId?: Record<string, FunMatchTeamScore>;
}) {
  const anchorRow = team.captain ?? team.players[0];

  if (isOfficial) {
    return (
      <OfficialStatusBadges
        registrationStatus={team.registrationStatus}
        paymentStatus={team.paymentStatus}
        amountIdr={team.amountIdr}
      />
    );
  }

  return (
    <FunMatchScore
      row={anchorRow}
      teamScoreByName={teamScoreByName}
      teamScoreByTeamId={teamScoreByTeamId}
    />
  );
}

function TeamActionButton({
  team,
  canRemoveTeams,
  isRemoving,
  removePending,
  onRemove,
}: {
  team: GroupedTeamEntry;
  canRemoveTeams: boolean;
  isRemoving: boolean;
  removePending: boolean;
  onRemove: (row: TournamentParticipantRow) => void;
}) {
  if (!canRemoveTeams) return null;
  const actionRow = team.captain ?? team.players[0];
  if (!actionRow) return null;

  if (team.canHardRemove === false) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-10 w-full cursor-not-allowed border-cp-border text-cp-muted lg:w-[170px]"
        disabled
        title="This team has already competed. Career stats are preserved."
      >
        <Lock className="mr-1.5 h-3.5 w-3.5" />
        Locked
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-10 w-full border-red-300/80 text-red-700 hover:bg-red-50 hover:text-red-800 lg:w-[170px] dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
      disabled={isRemoving || removePending}
      onClick={() => onRemove(actionRow)}
    >
      {isRemoving ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      Remove team
    </Button>
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
  partnerEvent = false,
}: TournamentParticipantsPanelProps) {
  const { confirm } = useConfirmDialog();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const activeSearch = debouncedSearch.trim();

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

  const groupedTeams = useMemo(() => {
    const map = new Map<string, GroupedTeamEntry>();
    for (const row of data?.items ?? []) {
      const current = map.get(row.teamId);
      if (current) {
        current.players.push(row);
        if (row.role.toLowerCase() === "captain") current.captain = row;
      } else {
        map.set(row.teamId, {
          teamId: row.teamId,
          teamName: row.teamName,
          players: [row],
          captain: row.role.toLowerCase() === "captain" ? row : undefined,
          registrationStatus: row.registrationStatus,
          paymentStatus: row.paymentStatus,
          amountIdr: row.amountIdr,
          canHardRemove: row.canHardRemove !== false,
        });
      }
    }
    return [...map.values()];
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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className={cn("h-5 w-5 shrink-0", accent)} />
            {partnerEvent
              ? "Registered teams"
              : isOfficial
                ? "Registered teams"
                : "Session squads"}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-cp-muted">
            {partnerEvent
              ? "Guest teams from your public registration form. Review rosters before play begins."
              : isOfficial
                ? isFreeOfficial
                  ? "Confirmed teams are grouped together so hosts can review each roster more clearly."
                  : "Confirmed and paid teams are grouped together so roster review stays clean and consistent."
                : "Active squads are grouped together to make lineup review easier across every screen size."}
            {canRemoveTeams
              ? partnerEvent
                ? " You can remove a team only if it has not played any matches yet."
                : " You can remove a team only if it has not played any matches yet — this keeps player career statistics consistent."
              : null}
          </p>
        </div>

        <div className="relative w-full shrink-0 xl:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-800 dark:text-cp-muted"
            aria-hidden
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value.slice(0, MAX_SEARCH_TERM_LENGTH));
              setPage(1);
            }}
            placeholder="Search player or team…"
            maxLength={MAX_SEARCH_TERM_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-label={isOfficial ? "Search registered teams" : "Search session squads"}
            className={cn(
              "border-cp-border bg-cp-bg-input pr-10 pl-10 text-foreground placeholder:text-cp-muted",
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
              <p className="text-sm text-foreground">Could not refresh registrations</p>
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
            { label: hasActiveSearch ? "Matches" : "Players", value: String(total) },
            { label: isOfficial ? "Teams" : "Squads", value: String(teamCount) },
            { label: "Page", value: `${page} / ${Math.max(1, data?.totalPages ?? 1)}` },
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
              : partnerEvent
                ? "No teams yet. Entries appear here after guests register on your public page."
                : "No players in the lobby yet. Join a squad to get started."}
          </p>
        </div>
      ) : showNoMatches ? (
        <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/40 px-6 py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-cp-muted/70" />
          <p className="mt-3 text-sm font-medium text-foreground">No registrations match your search</p>
          <p className="mt-1 text-xs text-cp-muted">
            Try another player or team name for &ldquo;{activeSearch}&rdquo;.
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
          <div className="border-b border-cp-border/80 bg-cp-elevated/20 px-4 py-3 lg:hidden">
            <p className="text-xs text-cp-muted">
              Teams are grouped together so each roster stays easier to scan on smaller screens.
            </p>
          </div>

          <div
            className={cn(
              "hidden items-center border-b border-cp-border/80 bg-cp-elevated/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-cp-muted lg:grid lg:gap-4 xl:gap-5",
              canRemoveTeams
                ? "lg:grid-cols-[minmax(160px,0.75fr)_minmax(260px,1.45fr)_minmax(140px,0.8fr)_minmax(140px,156px)] xl:grid-cols-[minmax(190px,0.8fr)_minmax(320px,1.55fr)_minmax(180px,0.9fr)_minmax(150px,170px)]"
                : "lg:grid-cols-[minmax(190px,0.85fr)_minmax(320px,1.7fr)_minmax(180px,1fr)]",
            )}
          >
            <span>Team / squad</span>
            <span>Players</span>
            <span>{isOfficial ? "Status" : "Score"}</span>
            {canRemoveTeams ? <span className="text-right">Actions</span> : null}
          </div>

          <ul className="space-y-3 p-3 lg:hidden">
            {groupedTeams.map((team) => (
              <li
                key={team.teamId}
                className="rounded-2xl border border-cp-border/80 bg-cp-card/90 p-4 shadow-sm transition-colors hover:bg-cp-elevated/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("truncate text-base font-semibold", teamAccent)}>{team.teamName}</p>
                    <p className="mt-1 text-xs text-cp-muted">
                      {team.players.length} player{team.players.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <TeamStatusCell
                      team={team}
                      isOfficial={isOfficial}
                      teamScoreByName={teamScoreByName}
                      teamScoreByTeamId={teamScoreByTeamId}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <TeamPlayersList players={team.players} variant={variant} />
                </div>

                {canRemoveTeams ? (
                  <div className="mt-4">
                    <TeamActionButton
                      team={team}
                      canRemoveTeams={canRemoveTeams}
                      isRemoving={removingTeamId === team.teamId}
                      removePending={removeTeam.isPending}
                      onRemove={(row) => void handleRemoveTeam(row)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <ul className="hidden divide-y divide-cp-border/70 lg:block">
            {groupedTeams.map((team) => (
              <li
                key={team.teamId}
                className={cn(
                  "grid items-start px-5 py-4 transition-colors hover:bg-cp-elevated/20 lg:gap-4 xl:gap-5",
                  canRemoveTeams
                    ? "lg:grid-cols-[minmax(160px,0.75fr)_minmax(260px,1.45fr)_minmax(140px,0.8fr)_minmax(140px,156px)] xl:grid-cols-[minmax(190px,0.8fr)_minmax(320px,1.55fr)_minmax(180px,0.9fr)_minmax(150px,170px)]"
                    : "lg:grid-cols-[minmax(190px,0.85fr)_minmax(320px,1.7fr)_minmax(180px,1fr)]",
                )}
              >
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-semibold", teamAccent)}>{team.teamName}</p>
                  <p className="mt-1 text-xs text-cp-muted">
                    {team.players.length} player{team.players.length === 1 ? "" : "s"}
                  </p>
                </div>

                <TeamPlayersList players={team.players} variant={variant} compact />

                <div className="min-w-0">
                  <TeamStatusCell
                    team={team}
                    isOfficial={isOfficial}
                    teamScoreByName={teamScoreByName}
                    teamScoreByTeamId={teamScoreByTeamId}
                  />
                </div>

                {canRemoveTeams ? (
                  <div className="flex min-w-0 justify-end">
                    <TeamActionButton
                      team={team}
                      canRemoveTeams={canRemoveTeams}
                      isRemoving={removingTeamId === team.teamId}
                      removePending={removeTeam.isPending}
                      onRemove={(row) => void handleRemoveTeam(row)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={teamCount}
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
