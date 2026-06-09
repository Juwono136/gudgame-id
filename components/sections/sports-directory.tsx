"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CircleDot,
  Disc,
  Footprints,
  ShieldAlert,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { SportPublicCard } from "@/lib/sports/service";
import { resolveUserImageUrl } from "@/lib/storage/media-url";
import { cn } from "@/lib/utils";
import Image from "next/image";

function subLinkHref(sportSlug: string, label: string, isLive: boolean): string {
  if (!isLive) return "#";
  if (label === "Equipment" || label === "Gear") return publicSportRoutes.gear(sportSlug);
  if (label === "Players" || label === "Rankings" || label === "Leaderboards")
    return publicSportRoutes.players(sportSlug);
  if (
    label === "Rules" ||
    label === "History" ||
    label === "Federations" ||
    label === "Training"
  ) {
    return publicSportRoutes.rules(sportSlug);
  }
  if (label === "Tournaments" || label === "Events")
    return publicSportRoutes.tournaments(sportSlug);
  return publicSportRoutes.sportHub(sportSlug);
}

const SLUG_ICONS: Record<string, { icon: ReactNode; iconBg: string }> = {
  padel: {
    icon: <CircleDot className="h-4 w-4 text-cp-primary" />,
    iconBg: "bg-cp-primary/15",
  },
  tennis: {
    icon: <Target className="h-4 w-4 text-[#B82800]" />,
    iconBg: "bg-[#8A1C00]/20",
  },
  badminton: {
    icon: <Activity className="h-4 w-4 text-[#0033C0]" />,
    iconBg: "bg-[#00228A]/25",
  },
  billiards: {
    icon: <Disc className="h-4 w-4 text-[#621100]" />,
    iconBg: "bg-[#3D0700]/30",
  },
  running: {
    icon: <Footprints className="h-4 w-4 text-[#4A6457]" />,
    iconBg: "bg-[#1C352A]/80",
  },
};

function defaultIcon(name: string) {
  return {
    icon: <Trophy className="h-4 w-4 text-cp-primary" />,
    iconBg: "bg-cp-primary/15",
  };
}

function buildSubLinks(sport: SportPublicCard) {
  const links: { label: string; icon: ReactNode }[] = [];
  if (sport.modules.tournaments)
    links.push({ label: "Tournaments", icon: <Trophy className="h-3.5 w-3.5 text-cp-primary" /> });
  if (sport.modules.players || sport.modules.rankings)
    links.push({ label: "Players", icon: <Users className="h-3.5 w-3.5 text-[#DAF8E7]" /> });
  if (sport.modules.gear)
    links.push({ label: "Equipment", icon: <Disc className="h-3.5 w-3.5 text-[#F0EFFF]" /> });
  if (sport.modules.rules)
    links.push({
      label: "Rules",
      icon: <ShieldAlert className="h-3.5 w-3.5 text-[#B82800]" />,
    });
  return links.slice(0, 4);
}

type SportsDirectoryProps = {
  sports: SportPublicCard[];
};

export default function SportsDirectory({ sports }: SportsDirectoryProps) {
  const liveCount = sports.filter((s) => s.isLive).length;

  return (
    <section
      id="sports-databases"
      className="relative scroll-mt-20"
      aria-labelledby="sports-databases-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,71,255,0.08),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <FadeInView>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cp-primary">
              Choose your sport
            </p>
            <h2
              id="sports-databases-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Sports Databases
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-cp-muted sm:text-base">
              Pick a discipline below to browse players, equipment, tournaments, and
              more.
              {liveCount > 0
                ? ` ${liveCount} sport${liveCount === 1 ? "" : "s"} live now — more rolling out soon.`
                : " New sports are rolling out soon."}
            </p>
          </div>
        </FadeInView>

        {sports.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
            Sports databases are being configured. Check back soon.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {sports.map((sport, index) => {
              const visual = SLUG_ICONS[sport.slug] ?? defaultIcon(sport.name);
              const subLinks = buildSubLinks(sport);
              const isLive = sport.isLive;
              const heroUrl = resolveUserImageUrl(sport.heroImageUrl);

              return (
                <FadeInView key={sport.id} delay={index * 0.05}>
                  <article
                    className={cn(
                      "group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all duration-300 sm:p-6",
                      isLive
                        ? "border-cp-primary/50 bg-cp-card shadow-[0_4px_24px_rgba(0,71,255,0.12)] ring-1 ring-cp-primary/20 hover:border-cp-primary/70 hover:shadow-[0_8px_32px_rgba(0,71,255,0.18)]"
                        : "border-cp-border bg-cp-card/60 saturate-[0.45] hover:border-cp-border-subtle",
                      !isLive && "opacity-70 grayscale-[0.25] backdrop-blur-[0.5px]",
                    )}
                  >
                    {heroUrl ? (
                      <div className="pointer-events-none absolute inset-0" aria-hidden>
                        <Image
                          src={heroUrl}
                          alt=""
                          fill
                          className={cn(
                            "object-cover",
                            isLive ? "opacity-[0.18]" : "opacity-[0.08] blur-[1px]",
                          )}
                          unoptimized
                        />
                        <div
                          className={cn(
                            "absolute inset-0 bg-gradient-to-b from-cp-card/30 via-cp-card/85 to-cp-card",
                            !isLive && "from-cp-card/50 via-cp-card/92 to-cp-card/95",
                          )}
                        />
                      </div>
                    ) : null}
                    <div className="relative z-[1]">
                      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-3 sm:gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                              visual.iconBg,
                            )}
                          >
                            {visual.icon}
                          </div>
                          <div className="min-w-0">
                            {isLive ? (
                              <Link
                                href={publicSportRoutes.sportHub(sport.slug)}
                                className="text-base font-bold text-foreground transition-colors hover:text-cp-primary sm:text-lg"
                              >
                                {sport.name}
                              </Link>
                            ) : (
                              <h3 className="text-base font-bold text-foreground sm:text-lg">
                                {sport.name}
                              </h3>
                            )}
                          </div>
                        </div>
                      </div>

                      {isLive ? (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cp-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cp-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-cp-primary" />
                          Live now
                        </span>
                      ) : (
                        <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-cp-text-dim">
                          Coming soon
                        </span>
                      )}

                      {sport.description ? (
                        <p className="mt-3 text-sm leading-relaxed text-cp-muted">
                          {sport.description}
                        </p>
                      ) : sport.tagline ? (
                        <p className="mt-3 text-sm leading-relaxed text-cp-muted">
                          {sport.tagline}
                        </p>
                      ) : null}
                    </div>

                    {subLinks.length > 0 ? (
                      <div className="relative z-[1] mt-5 grid grid-cols-2 gap-2">
                        {subLinks.map((link) => (
                          <Link
                            key={link.label}
                            href={subLinkHref(sport.slug, link.label, isLive)}
                            className={cn(
                              "btn-interactive flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium sm:px-3",
                              isLive
                                ? "border-cp-border bg-cp-bg/80 text-cp-muted hover:border-cp-primary/30 hover:bg-cp-elevated hover:text-foreground"
                                : "pointer-events-none border-cp-border/60 bg-cp-bg/40 text-cp-text-dim",
                            )}
                          >
                            {link.icon}
                            <span className="truncate">{link.label}</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {isLive ? (
                      <Link
                        href={publicSportRoutes.sportHub(sport.slug)}
                        className="btn-interactive relative z-[1] mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cp-primary py-2.5 text-sm font-semibold text-white hover:bg-cp-primary-light"
                      >
                        Open
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </article>
                </FadeInView>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
