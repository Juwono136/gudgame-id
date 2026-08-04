import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import type { PartnerLeagueDetail, PartnerLeagueListItem } from "@/lib/partners/league-types";
import { cn } from "@/lib/utils";

type LeagueBannerSource = Pick<
  PartnerLeagueDetail | PartnerLeagueListItem,
  "name" | "status" | "sportName" | "summary" | "brandImageUrl"
> & {
  description?: string | null;
  teamCount?: number;
  matchCount?: number;
};

type PartnerLeagueBannerProps = {
  league: LeagueBannerSource;
  backHref: string;
  backLabel?: string;
  tournamentCount: number;
  primaryColor: string;
  accentColor: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Shared hero for public + dashboard league detail.
 * Uses theme tokens for text so light/dark mode stay readable.
 */
export function PartnerLeagueBanner({
  league,
  backHref,
  backLabel = "Leagues",
  tournamentCount,
  primaryColor,
  accentColor,
  actions,
  className,
}: PartnerLeagueBannerProps) {
  // Sport is an internal tenant default — partners do not declare it in the UI.
  const metaParts = [
    `${tournamentCount} tournament${tournamentCount === 1 ? "" : "s"}`,
  ];
  if ((league.teamCount ?? 0) > 0) {
    metaParts.push(`${league.teamCount} teams`);
  }
  if ((league.matchCount ?? 0) > 0) {
    metaParts.push(`${league.matchCount} matches`);
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-70"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 80% at 0% 0%, ${primaryColor}22, transparent 55%),
            radial-gradient(ellipse 50% 60% at 100% 100%, ${accentColor}18, transparent 50%),
            linear-gradient(180deg, transparent 40%, var(--cp-card, transparent) 100%)
          `,
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:gap-6 sm:p-7 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="flex shrink-0 justify-center lg:block">
          <div
            className={cn(
              "relative h-28 w-28 overflow-hidden rounded-2xl border border-cp-border bg-cp-elevated shadow-sm",
              "sm:h-32 sm:w-32",
              "ring-1 ring-black/5 dark:ring-white/10",
            )}
          >
            {league.brandImageUrl?.trim() ? (
              <Image
                src={league.brandImageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="128px"
                unoptimized
                priority
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  background: `linear-gradient(145deg, ${primaryColor}28, transparent 70%)`,
                }}
              >
                <Trophy className="h-10 w-10 text-cp-primary" aria-hidden />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cp-primary transition-colors hover:text-cp-primary-light"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {backLabel}
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PartnerStatusBadge status={league.status} />
                <span className="text-sm text-cp-muted">{metaParts.join(" · ")}</span>
              </div>

              <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {league.name}
              </h1>

              {league.summary?.trim() ? (
                <div className="max-w-2xl text-sm leading-relaxed text-cp-muted [&_.rich-html]:text-cp-muted">
                  <RichHtmlContent html={league.summary} variant="article" />
                </div>
              ) : (
                <p className="max-w-2xl text-sm leading-relaxed text-cp-muted">
                  Season tournaments, standings, and match history for this league.
                </p>
              )}
            </div>

            {actions ? (
              <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:max-w-sm lg:justify-end">
                {actions}
              </div>
            ) : null}
          </div>

          {league.description?.trim() ? (
            <div className="max-w-3xl border-t border-cp-border/70 pt-4 text-sm leading-relaxed text-foreground [&_.rich-html]:text-foreground/90">
              <RichHtmlContent html={league.description} variant="article" className="!text-foreground/90" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
