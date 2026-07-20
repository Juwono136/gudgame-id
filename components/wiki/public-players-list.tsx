"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, TrendingUp, User } from "lucide-react";
import { publicSportRoutes } from "@/lib/constants/routes";
import { normalizePlayerTier } from "@/lib/player/tier";
import type { PublicPlayerListItem } from "@/lib/wiki/public-players";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, string> = {
  pemula: cn(
    "border-slate-400/50 bg-slate-100 text-slate-700",
    "dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200",
  ),
  menengah: cn(
    "border-cp-primary/35 bg-cp-primary/10 text-cp-primary",
    "dark:border-cp-primary/40 dark:bg-cp-primary/15 dark:text-emerald-200",
  ),
  pro: cn(
    "border-amber-500/40 bg-amber-50 text-amber-800",
    "dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  ),
  gold: cn(
    "border-yellow-500/45 bg-yellow-50 text-yellow-900",
    "dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-200",
  ),
};

function formatPoints(points: number | null): string {
  if (points == null || points === 0) return "0";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(points);
}

function formatWinRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${rate}%`;
}

function formatLocation(player: PublicPlayerListItem): string {
  const parts = [player.province, player.nationality].filter(Boolean);
  if (parts.length) return [...new Set(parts)].join(", ");
  return "—";
}

function TierBadge({ tier, tierLevel }: { tier: string | null; tierLevel: string | null }) {
  const key = normalizePlayerTier(tierLevel ?? tier) ?? "pemula";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TIER_STYLES[key] ?? TIER_STYLES.pemula,
      )}
    >
      {tier ?? "Beginner"}
    </span>
  );
}

function playerSubtitle(player: PublicPlayerListItem): string | null {
  return player.playingStyle?.trim() || player.nickname?.trim() || null;
}

function PlayerAvatar({ player }: { player: PublicPlayerListItem }) {
  return (
    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-cp-border bg-cp-elevated sm:h-12 sm:w-12">
      {player.avatarUrl ? (
        <Image src={player.avatarUrl} alt="" fill className="object-cover" unoptimized />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-cp-muted">
          <User className="h-5 w-5" />
        </span>
      )}
    </span>
  );
}

type PublicPlayersListProps = {
  sportSlug: string;
  items: PublicPlayerListItem[];
};

export function PublicPlayersList({ sportSlug, items }: PublicPlayersListProps) {
  return (
    <>
      {/* Mobile / tablet cards */}
      <div className="divide-y divide-cp-border lg:hidden">
        {items.map((player) => {
          const href = publicSportRoutes.player(sportSlug, player.slug);
          const location = formatLocation(player);
          const subtitle = playerSubtitle(player);

          return (
            <Link
              key={player.slug}
              href={href}
              className="group block px-4 py-4 transition-colors hover:bg-cp-elevated/30 sm:px-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cp-border bg-cp-elevated/60 text-sm font-bold text-foreground">
                  #{player.rank}
                </div>
                <PlayerAvatar player={player} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground group-hover:text-cp-primary">
                      {player.displayName}
                    </p>
                    <TierBadge tier={player.tier} tierLevel={player.tierLevel} />
                  </div>
                  {subtitle ? (
                    <p className="truncate text-xs text-cp-muted">{subtitle}</p>
                  ) : null}
                  {player.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cp-muted">
                      {player.summary}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cp-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {location}
                    </span>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cp-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-cp-border/80 bg-cp-elevated/30 p-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                    Points
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                    {formatPoints(player.points)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                    Win rate
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                    {formatWinRate(player.winRate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                    World rank
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                    {player.worldRank != null ? `#${player.worldRank}` : "—"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cp-border bg-cp-elevated/50 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
              <th className="w-16 px-6 py-3">Rank</th>
              <th className="min-w-[220px] px-4 py-3">Player</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Win rate</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-cp-border">
            {items.map((player) => {
              const href = publicSportRoutes.player(sportSlug, player.slug);
              const subtitle = playerSubtitle(player);
              return (
                <tr key={player.slug} className="transition-colors hover:bg-cp-elevated/25">
                  <td className="px-6 py-4">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-cp-border bg-cp-elevated/50 px-2 text-sm font-bold text-foreground">
                      {player.rank}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={href} className="group inline-flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={player} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-foreground group-hover:text-cp-primary">
                          {player.displayName}
                        </span>
                        {subtitle ? (
                          <span className="mt-0.5 block truncate text-xs text-cp-muted">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-cp-muted">{formatLocation(player)}</td>
                  <td className="px-4 py-4">
                    <TierBadge tier={player.tier} tierLevel={player.tierLevel} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="inline-flex items-center justify-end gap-1 font-semibold tabular-nums text-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-cp-primary" />
                      {formatPoints(player.points)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums text-foreground">
                    {formatWinRate(player.winRate)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cp-primary hover:underline"
                    >
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
