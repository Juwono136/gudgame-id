"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CircleDot,
  ChevronRight,
  BookOpen,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { SportPublicCard } from "@/lib/sports/service";
import { resolveUserImageUrl } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type SportHubCardProps = {
  sport: SportPublicCard;
  className?: string;
};

const SPORT_ICONS: Record<string, typeof Trophy> = {
  padel: CircleDot,
  tennis: CircleDot,
  badminton: CircleDot,
  pickleball: CircleDot,
};

const NAV_LINKS = [
  { key: "tournaments", label: "Tournament", icon: Trophy },
  { key: "players", label: "Players", icon: Users },
  { key: "gear", label: "Gear", icon: ShoppingBag },
  { key: "rules", label: "Rules", icon: BookOpen },
] as const;

function navHref(sportSlug: string, key: (typeof NAV_LINKS)[number]["key"], isLive: boolean): string {
  if (!isLive) return "#";
  if (key === "tournaments") return publicSportRoutes.tournaments(sportSlug);
  if (key === "players") return publicSportRoutes.players(sportSlug);
  if (key === "gear") return publicSportRoutes.gear(sportSlug);
  return publicSportRoutes.rules(sportSlug);
}

export function SportHubCard({ sport, className }: SportHubCardProps) {
  const isLive = sport.isLive;
  const hero = sport.heroImageUrl ? resolveUserImageUrl(sport.heroImageUrl) : null;
  const SportIcon = SPORT_ICONS[sport.slug] ?? CircleDot;
  const hubUrl = publicSportRoutes.sportHub(sport.slug);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-cp-card shadow-sm transition-all duration-300",
        isLive
          ? "border-cp-border hover:border-cp-primary/40 hover:shadow-md"
          : "border-cp-border/70 opacity-80",
        className,
      )}
    >
      {isLive ? (
        <Link
          href={hubUrl}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cp-background"
          aria-label={`Browse ${sport.name}`}
        />
      ) : null}

      <div className="relative z-[1] pointer-events-none flex flex-1 flex-col">
        <div className="relative min-h-[120px] overflow-hidden bg-cp-elevated/60 sm:min-h-[132px]">
          {hero ? (
            <Image
              src={hero}
              alt=""
              fill
              className="object-cover object-center opacity-30 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-40 dark:opacity-25 dark:group-hover:opacity-35"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              unoptimized
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-cp-card/95 via-cp-card/80 to-cp-primary/10" />

          <div className="relative flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cp-primary/30 bg-cp-primary/10 text-cp-primary sm:h-12 sm:w-12">
              <SportIcon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {sport.name}
                </h3>
                {isLive ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-cp-muted opacity-0 transition group-hover:opacity-100" />
                ) : null}
              </div>
              {isLive ? (
                <Badge className="mt-1.5 border-0 bg-cp-primary/15 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-cp-primary">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-cp-primary" aria-hidden />
                  Live now
                </Badge>
              ) : (
                <span className="mt-1 inline-block text-xs font-medium uppercase tracking-wider text-cp-muted">
                  Coming soon
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav
        className="relative z-[2] grid grid-cols-4 border-t border-cp-border bg-cp-elevated/40"
        aria-label={`${sport.name} quick links`}
      >
        {NAV_LINKS.map((item, index) => {
          const Icon = item.icon;
          const href = navHref(sport.slug, item.key, isLive);
          return (
            <Link
              key={item.key}
              href={href}
              tabIndex={isLive ? 0 : -1}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-1.5 py-3 text-[10px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-xs",
                index > 0 && "before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-px before:bg-cp-border",
                isLive
                  ? "text-cp-muted hover:bg-cp-elevated hover:text-foreground"
                  : "pointer-events-none text-cp-muted/40",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-cp-primary sm:h-4 sm:w-4" strokeWidth={2} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </article>
  );
}

export function SportHubCardGrid({
  sports,
  className,
}: {
  sports: SportPublicCard[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2",
        className,
      )}
    >
      {sports.map((sport) => (
        <SportHubCard key={sport.id} sport={sport} />
      ))}
    </div>
  );
}
