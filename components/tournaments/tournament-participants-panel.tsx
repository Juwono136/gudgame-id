"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CreditCard, RefreshCw, UserRound, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/constants";
import type { TournamentParticipantRow } from "@/lib/tournaments/participants/query";
import { cn } from "@/lib/utils";

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
    <Link
      href={row.profileUrl}
      className={cn(
        "group block min-w-0",
        hoverAccent,
      )}
    >
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
    <Link href={row.profileUrl} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary">
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
  const label =
    rankingPts > 0 ? `${rankingPts} pts` : `${stat.pointsFor} pts`;

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
}: TournamentParticipantsPanelProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading, isFetching, isError, error, refetch } = useTournamentParticipants(
    sportSlug,
    slug,
    page,
    pageSize,
  );

  const isOfficial = tournamentType === "official";
  const isFreeOfficial = officialBilling === "free";
  const accent = variant === "official" ? "text-cp-primary" : "text-emerald-400";
  const teamAccent =
    variant === "official" ? "text-amber-300/95" : "text-emerald-300/95";

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading players…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-foreground">Could not load player list</p>
        <p className="mt-1 text-xs text-cp-muted">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <Button variant="outline" size="sm" className="mt-4 border-cp-border" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const uniqueTeams = new Set(items.map((row) => row.teamId)).size;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className={cn("h-5 w-5", accent)} />
            {isOfficial ? "Registered players" : "Session players"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-cp-muted">
            {isOfficial
              ? isFreeOfficial
                ? "Confirmed teams with completed registration — updated as players finalize their spot."
                : "Confirmed teams with completed payment — updated as registrations are finalized."
              : "Everyone currently in the lobby squads for this Fun Match."}
          </p>
        </div>
        {isFetching && !isLoading ? (
          <span className="text-xs text-cp-muted">Refreshing…</span>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {[
            { label: "Players", value: String(total) },
            { label: isOfficial ? "Teams" : "Squads", value: String(uniqueTeams) },
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

      {total === 0 ? (
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
      ) : (
        <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
          <div className="hidden border-b border-cp-border/80 bg-cp-elevated/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-cp-muted lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_minmax(0,1.1fr)] lg:gap-4 lg:px-5">
            <span>Player</span>
            <span>Team / squad</span>
            <span>Role</span>
            <span className="text-right">{isOfficial ? "Status" : "Score"}</span>
          </div>

          <ul className="divide-y divide-cp-border/70">
            {items.map((row) => (
              <li
                key={`${row.teamId}-${row.userId}`}
                className="p-4 transition-colors hover:bg-cp-elevated/20 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_minmax(0,1.1fr)] lg:items-center lg:gap-4 lg:px-5 lg:py-3.5"
              >
                <ParticipantPlayerCell row={row} variant={variant} />

                <div className="mt-3 min-w-0 lg:mt-0">
                  <p className={cn("truncate text-sm font-medium", teamAccent)}>{row.teamName}</p>
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
              </li>
            ))}
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
