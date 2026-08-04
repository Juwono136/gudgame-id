"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Trash2,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useArchivePartnerPlayer } from "@/hooks/use-archive-partner-player";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import type { PartnerPlayerDetail } from "@/lib/partners/player-stats";
import { cn } from "@/lib/utils";

type PartnerPlayerDetailClientProps = {
  partnerSlug: string;
  partnerName: string;
  playerId: string;
  primaryColor: string;
};

function formatWinRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${rate}%`;
}

function formatPlayedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "win" | "loss" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-cp-border bg-cp-elevated/40 px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
          tone === "win" && "text-emerald-700 dark:text-emerald-300",
          tone === "loss" && "text-rose-700 dark:text-rose-300",
          (!tone || tone === "neutral") && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PartnerPlayerDetailClient({
  partnerSlug,
  partnerName,
  playerId,
  primaryColor,
}: PartnerPlayerDetailClientProps) {
  const { archivePlayer, isPending: deleting } = useArchivePartnerPlayer();
  const { data, isLoading, isError, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["partner-player-detail", partnerSlug, playerId],
    queryFn: async (): Promise<PartnerPlayerDetail> => {
      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/players/${encodeURIComponent(playerId)}`,
      );
      const json = await parseJsonResponse<{
        success: true;
        data: { player: PartnerPlayerDetail };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not load player",
        );
      }
      return json.data.player;
    },
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  });

  const player = data;
  const initial = (player?.fullName?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div className="space-y-6 sm:space-y-8">
      {deleting ? <LoadingOverlay show label="Removing player…" /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={partnerPublicRoutes.players(partnerSlug)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cp-primary hover:text-cp-primary-light"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Players
          </Link>
          <p className="mt-2 text-xs font-medium text-cp-muted">
            Staff-only · {partnerName} · synced from completed tournament matches
            {isFetching && !isLoading ? " · refreshing…" : ""}
          </p>
        </div>
        {player ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
            disabled={deleting}
            onClick={() =>
              void archivePlayer({
                partnerSlug,
                playerId,
                playerName: player.fullName,
                redirectTo: partnerPublicRoutes.players(partnerSlug),
              })
            }
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Remove from list
          </Button>
        ) : null}
      </div>

      {isLoading && !player ? (
        <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-cp-border bg-cp-card">
          <Loader2 className="h-8 w-8 animate-spin text-cp-primary" aria-hidden />
        </div>
      ) : isError || !player ? (
        <div className="rounded-2xl border border-destructive/30 bg-cp-card px-4 py-10 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Player not found."}
        </div>
      ) : (
        <>
          <section
            className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:p-7"
            style={{
              background: `linear-gradient(125deg, ${primaryColor}18 0%, transparent 55%), var(--cp-card, transparent)`,
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <span
                className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-cp-border bg-cp-elevated text-2xl font-bold text-cp-primary shadow-sm sm:mx-0 sm:h-24 sm:w-24 sm:text-3xl"
                aria-hidden
              >
                {initial}
              </span>
              <div className="min-w-0 text-center sm:text-left">
                <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {player.fullName}
                </h1>
                <p className="mt-2 text-sm text-cp-muted">
                  Unique partner player ID · stats from your white-label events only
                </p>
                <p className="mt-1 text-xs text-cp-muted">
                  Last match: {formatPlayedAt(player.lastPlayedAt)}
                  {dataUpdatedAt
                    ? ` · Synced ${new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(dataUpdatedAt))}`
                    : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Performance
              </h2>
              <p className="mt-0.5 text-xs text-cp-muted sm:text-sm">
                Rebuilt from completed group, bracket, and Americano matches in your tournaments —
                refreshes while this page is open.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <StatCard label="Wins" value={player.wins} tone="win" />
              <StatCard label="Losses" value={player.losses} tone="loss" />
              <StatCard label="Win rate" value={formatWinRate(player.winRate)} />
              <StatCard label="Matches" value={player.matchesPlayed} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cp-primary" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Recent matches
                </h2>
                <p className="text-xs text-cp-muted">Latest results for this player</p>
              </div>
            </div>
            {player.matches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 px-4 py-8 text-center text-sm text-cp-muted">
                No recorded matches yet. Results appear after group or bracket matches are completed.
              </p>
            ) : (
              <ul className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
                {player.matches.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {m.opponents}
                      </p>
                      <p className="mt-0.5 text-xs text-cp-muted">
                        {m.tournamentName}
                        {m.round ? ` · ${m.round}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs tabular-nums text-cp-muted">
                        {m.score ?? "—"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                          m.resultType === "win"
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : "bg-rose-500/15 text-rose-800 dark:text-rose-300",
                        )}
                      >
                        {m.resultType}
                      </span>
                      <span className="hidden text-xs text-cp-muted sm:inline">
                        {formatPlayedAt(m.playedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cp-primary" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Tournament history
                </h2>
                <p className="text-xs text-cp-muted">Placements recorded for this player</p>
              </div>
            </div>
            {player.tournamentResults.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-cp-border bg-cp-card/60 px-4 py-8 text-center text-sm text-cp-muted">
                No tournament placements yet.
              </p>
            ) : (
              <ul className="divide-y divide-cp-border overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
                {player.tournamentResults.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.tournamentName}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-cp-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" aria-hidden />
                          {r.year}
                        </span>
                        {r.category ? <span>· {r.category}</span> : null}
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-cp-border bg-cp-elevated/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cp-muted">
                      <Users className="h-3 w-3" aria-hidden />
                      {r.placement}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
