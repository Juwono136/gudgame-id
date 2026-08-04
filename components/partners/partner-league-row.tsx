"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { Button } from "@/components/ui/button";
import type { PartnerLeagueListItem } from "@/lib/partners/league-types";
import { cn } from "@/lib/utils";

export function PartnerLeagueRow({
  league,
  href,
  publicHref,
  manageHref,
  onDelete,
  deleting = false,
  className,
}: {
  league: PartnerLeagueListItem;
  href?: string;
  publicHref?: string;
  manageHref?: string;
  onDelete?: () => void;
  deleting?: boolean;
  className?: string;
}) {
  const hasActions = Boolean(publicHref || manageHref || onDelete);
  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <Trophy className="h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
        <p className="truncate font-medium text-foreground">{league.name}</p>
        <PartnerStatusBadge status={league.status} />
      </div>
      <p className="mt-0.5 text-xs text-cp-muted">
        {league.sportName} · {league.teamCount} teams · {league.matchCount} matches
      </p>
    </div>
  );

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      {href && !hasActions ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
          {body}
          <span className="shrink-0 text-xs font-medium text-cp-primary">Open</span>
        </Link>
      ) : (
        <>
          {href ? (
            <Link href={href} className="min-w-0 flex-1 hover:opacity-90">
              {body}
            </Link>
          ) : (
            body
          )}
          {hasActions ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {publicHref ? (
                <Button asChild variant="outline" size="sm" className="border-cp-border">
                  <Link href={publicHref} target="_blank" rel="noopener noreferrer">
                    Public
                  </Link>
                </Button>
              ) : null}
              {manageHref ? (
                <Button asChild size="sm" className="bg-cp-primary hover:bg-cp-primary-light">
                  <Link href={manageHref}>Manage</Link>
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={deleting}
                  onClick={onDelete}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}
