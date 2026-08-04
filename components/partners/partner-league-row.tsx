"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { PartnerDashboardCardActions } from "@/components/partners/partner-dashboard-card-actions";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { CoverImageFallback } from "@/components/shared/cover-image-fallback";
import { Button } from "@/components/ui/button";
import type { PartnerLeagueListItem } from "@/lib/partners/league-types";
import { stripHtmlToText } from "@/lib/tournaments/form/field-limits";
import { cn } from "@/lib/utils";

export function PartnerLeagueRow({
  league,
  href,
  publicHref,
  manageHref,
  editHref,
  onDelete,
  deleting = false,
  className,
}: {
  league: PartnerLeagueListItem;
  href?: string;
  publicHref?: string;
  manageHref?: string;
  editHref?: string;
  onDelete?: () => void;
  deleting?: boolean;
  className?: string;
}) {
  const hasDashboardActions = Boolean(publicHref || manageHref || editHref || onDelete);
  const brand = league.brandImageUrl?.trim() || null;
  const summary = league.summary?.trim() ? stripHtmlToText(league.summary) : null;

  const thumb = (
    <span className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cp-border bg-cp-elevated sm:h-16 sm:w-16">
      {brand ? (
        <Image src={brand} alt="" fill className="object-cover" sizes="64px" unoptimized />
      ) : (
        <CoverImageFallback size="thumb" icon={Trophy} />
      )}
    </span>
  );

  const meta = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
          {league.name}
        </p>
        <PartnerStatusBadge status={league.status} />
      </div>
      {summary ? (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cp-muted sm:text-sm">
          {summary}
        </p>
      ) : (
        <p className="mt-1 text-xs text-cp-muted">Season standings and fixtures</p>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cp-muted">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {league.teamCount} teams
        </span>
        <span className="inline-flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {league.matchCount} matches
        </span>
      </p>
    </div>
  );

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm",
        "transition-colors hover:border-cp-primary/35 hover:shadow-md",
        className,
      )}
    >
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        {href && !hasDashboardActions ? (
          <Link
            href={href}
            className="flex min-w-0 flex-1 items-start gap-3 sm:items-center"
          >
            {thumb}
            {meta}
            <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-full border border-cp-border bg-cp-elevated/50 px-2.5 py-1 text-xs font-semibold text-cp-primary sm:inline-flex">
              Open
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ) : (
          <>
            {href ? (
              <Link
                href={href}
                className="flex min-w-0 flex-1 items-start gap-3 hover:opacity-95 sm:items-center"
              >
                {thumb}
                {meta}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                {thumb}
                {meta}
              </div>
            )}

            {hasDashboardActions && manageHref && publicHref ? (
              <div className="w-full shrink-0 sm:w-auto sm:min-w-[11.5rem]">
                <PartnerDashboardCardActions
                  layout="inline"
                  manageHref={manageHref}
                  publicHref={publicHref}
                  editHref={editHref}
                  onDelete={onDelete}
                  deleting={deleting}
                />
              </div>
            ) : href ? (
              <Button
                asChild
                size="sm"
                className="w-full rounded-full bg-cp-primary sm:ml-auto sm:w-auto"
              >
                <Link href={href}>
                  View league
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
