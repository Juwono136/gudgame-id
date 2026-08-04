"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { CoverImageFallback } from "@/components/shared/cover-image-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PartnerLeagueListItem } from "@/lib/partners/league-types";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-600 text-white",
  completed: "bg-slate-900/85 text-white dark:bg-slate-100 dark:text-slate-900",
  draft: "bg-amber-500 text-white",
  archived: "bg-cp-elevated/95 text-cp-muted",
};

export function PartnerLeagueDiscoveryCard({
  league,
  href,
  actions,
  className,
}: {
  league: PartnerLeagueListItem;
  href: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-cp-primary/40 hover:shadow-md",
        className,
      )}
    >
      <Link
        href={href}
        className="relative flex aspect-[16/11] items-center justify-center overflow-hidden bg-cp-elevated"
      >
        {league.brandImageUrl?.trim() ? (
          <Image
            src={league.brandImageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <CoverImageFallback size="card" icon={Trophy} />
        )}
        <div
          className={cn(
            "absolute inset-0",
            league.brandImageUrl?.trim()
              ? "bg-gradient-to-t from-black/40 via-transparent to-transparent"
              : "bg-gradient-to-t from-black/20 via-transparent to-transparent",
          )}
        />
        <Badge
          className={cn(
            "absolute left-3 top-3 z-[1] border-0 text-[10px] font-bold uppercase tracking-wider",
            STATUS_STYLES[league.status] ?? STATUS_STYLES.completed,
          )}
        >
          {league.status}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-cp-primary sm:text-[1.05rem]">
            {league.name}
          </h3>
        </Link>
        {league.summary?.trim() ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-cp-muted">
            {stripHtmlToText(league.summary)}
          </p>
        ) : (
          <p className="text-sm text-cp-muted">Season standings and fixtures</p>
        )}

        <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cp-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {league.teamCount} teams
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            {league.matchCount} matches
          </span>
        </p>

        <div className="mt-auto border-t border-cp-border/70 pt-3">
          {actions ? (
            actions
          ) : (
            <div className="flex justify-end">
              <Button
                asChild
                size="sm"
                className="rounded-full bg-cp-primary px-4 hover:bg-cp-primary-light"
              >
                <Link href={href}>
                  View league
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
