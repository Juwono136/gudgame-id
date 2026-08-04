"use client";

import Link from "next/link";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PartnerLeagueListItem } from "@/lib/partners/league-types";
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
        className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br from-cp-primary/20 via-cp-elevated to-cp-card"
      >
        <Trophy className="h-12 w-12 text-cp-primary/70 transition-transform duration-300 group-hover:scale-110" />
        <Badge
          className={cn(
            "absolute left-3 top-3 border-0 text-[10px] font-bold uppercase tracking-wider",
            STATUS_STYLES[league.status] ?? STATUS_STYLES.completed,
          )}
        >
          {league.status}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <Badge className="w-fit border-cp-border bg-cp-elevated/60 text-[10px] font-semibold uppercase text-cp-muted">
          {league.sportName}
        </Badge>

        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-cp-primary sm:text-lg">
            {league.name}
          </h3>
        </Link>

        <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cp-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {league.teamCount} teams
          </span>
          <span>{league.matchCount} matches</span>
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
                  Standings
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
