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

type TournamentParticipantsPanelProps = {
  sportSlug: string;
  slug: string;
  tournamentType: "official" | "fun_match";
  variant?: "official" | "reclub";
  officialBilling?: string | null;
  /** Fun match: squad points from session stats keyed by team name */
  teamScoreByName?: Record<string, { pointsFor: number; wins: number }>;
};

function formatIdr(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatJoinedAt(iso: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
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

function ParticipantPlayerCell({
  row,
  variant,
  avatarClassName,
}: {
  row: TournamentParticipantRow;
  variant: "official" | "reclub";
  avatarClassName?: string;
}) {
  const hoverAccent =
    variant === "official"
      ? "group-hover:text-cp-primary"
      : "group-hover:text-emerald-300";

  const avatar = (
    <Avatar className={cn("border border-cp-border", avatarClassName ?? "h-9 w-9")}>
      <AvatarImage src={row.image ?? undefined} alt="" />
      <AvatarFallback className="bg-cp-elevated text-xs">
        {initials(row.displayName)}
      </AvatarFallback>
    </Avatar>
  );

  if (!row.profileUrl) {
    return (
      <div className="flex items-center gap-3">
        {avatar}
        <span className="font-medium text-foreground">{row.displayName}</span>
      </div>
    );
  }

  return (
    <Link
      href={row.profileUrl}
      className="group inline-flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/50"
    >
      {avatar}
      <span className={cn("font-medium text-foreground transition-colors", hoverAccent)}>
        {row.displayName}
      </span>
    </Link>
  );
}

export function TournamentParticipantsPanel({
  sportSlug,
  slug,
  tournamentType,
  variant = tournamentType === "official" ? "official" : "reclub",
  officialBilling,
  teamScoreByName,
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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-cp-border bg-cp-elevated/50 text-xs uppercase tracking-wider text-cp-muted">
                  <th className="px-4 py-3 font-semibold sm:px-6">Player</th>
                  <th className="px-4 py-3 font-semibold">Gender</th>
                  <th className="px-4 py-3 font-semibold">Team / squad</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  {isOfficial ? (
                    <>
                      <th className="px-4 py-3 font-semibold">Registration</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                    </>
                  ) : (
                    <th className="px-4 py-3 font-semibold">Score</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={`${row.teamId}-${row.userId}`}
                    className="border-b border-cp-border/60 transition-colors last:border-0 hover:bg-cp-elevated/30"
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <ParticipantPlayerCell row={row} variant={variant} />
                    </td>
                    <td className="px-4 py-3 text-cp-muted">
                      {row.genderLabel ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.teamName}</td>
                    <td className="px-4 py-3 capitalize text-cp-muted">{row.role}</td>
                    {isOfficial ? (
                      <>
                        <td className="px-4 py-3">
                          <Badge variant="muted" className="capitalize">
                            {row.registrationStatus?.replace(/_/g, " ") ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={paymentBadgeVariant(row.paymentStatus)}
                            className="capitalize"
                          >
                            {row.paymentStatus ?? "—"}
                          </Badge>
                          {row.amountIdr != null ? (
                            <p className="mt-1 text-xs text-cp-muted">{formatIdr(row.amountIdr)}</p>
                          ) : null}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-sm tabular-nums text-foreground">
                        {(() => {
                          const stat = teamScoreByName?.[row.teamName];
                          if (!stat || (stat.pointsFor === 0 && stat.wins === 0)) {
                            return <span className="text-cp-muted">—</span>;
                          }
                          return (
                            <span>
                              {stat.pointsFor} pts
                              {stat.wins > 0 ? (
                                <span className="ml-1.5 text-xs text-cp-muted">
                                  · {stat.wins}W
                                </span>
                              ) : null}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-cp-border md:hidden">
            {items.map((row) => (
              <article key={`${row.teamId}-${row.userId}`} className="space-y-2 p-4">
                <ParticipantPlayerCell
                  row={row}
                  variant={variant}
                  avatarClassName="h-10 w-10"
                />
                <p className="text-sm text-cp-muted">
                  {row.genderLabel ? `${row.genderLabel} · ` : ""}
                  {row.teamName} · <span className="capitalize">{row.role}</span>
                </p>
                {isOfficial ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="muted" className="capitalize">
                      {row.registrationStatus?.replace(/_/g, " ") ?? "—"}
                    </Badge>
                    <Badge variant={paymentBadgeVariant(row.paymentStatus)} className="capitalize">
                      <CreditCard className="mr-1 h-3 w-3" />
                      {row.paymentStatus ?? "—"}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm tabular-nums text-foreground">
                    {(() => {
                      const stat = teamScoreByName?.[row.teamName];
                      if (!stat || (stat.pointsFor === 0 && stat.wins === 0)) {
                        return <span className="text-cp-muted">No score yet</span>;
                      }
                      return (
                        <>
                          Score: {stat.pointsFor} pts
                          {stat.wins > 0 ? ` · ${stat.wins} wins` : ""}
                        </>
                      );
                    })()}
                  </p>
                )}
              </article>
            ))}
          </div>

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
