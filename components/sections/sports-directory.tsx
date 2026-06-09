"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Award,
  CircleDot,
  Disc,
  Footprints,
  ShieldAlert,
  Target,
  Trophy,
} from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { publicSportRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

function subLinkHref(sportSlug: string, label: string, active?: boolean): string {
  if (!active) return "#";
  if (label === "Equipment" || label === "Gear") return publicSportRoutes.gear(sportSlug);
  if (label === "Rankings") return publicSportRoutes.players(sportSlug);
  return publicSportRoutes.sportHub(sportSlug);
}

interface SportCardData {
  name: string;
  slug: string;
  entries: string;
  description: string;
  icon: ReactNode;
  iconBg: string;
  active?: boolean;
  comingSoon?: boolean;
  subLinks: { label: string; icon: ReactNode }[];
}

const sportsDatabase: SportCardData[] = [
  {
    name: "Padel",
    slug: "padel",
    entries: "12.4K ENTRIES",
    description:
      "Comprehensive coverage of Premier Padel, WPT, player profiles, and technical gear reviews.",
    icon: <CircleDot className="h-4 w-4 text-cp-primary" />,
    iconBg: "bg-cp-primary/15",
    active: true,
    subLinks: [
      { label: "Tournaments", icon: <Trophy className="h-3.5 w-3.5 text-cp-primary" /> },
      { label: "Rankings", icon: <Award className="h-3.5 w-3.5 text-[#DAF8E7]" /> },
      { label: "Equipment", icon: <Disc className="h-3.5 w-3.5 text-[#F0EFFF]" /> },
      { label: "Rules", icon: <ShieldAlert className="h-3.5 w-3.5 text-[#B82800]" /> },
    ],
  },
  {
    name: "Tennis",
    slug: "tennis",
    entries: "45.2K ENTRIES",
    description:
      "ATP, WTA, Grand Slams, historical stats directory, and custom string tension analysis guides.",
    icon: <Target className="h-4 w-4 text-[#B82800]" />,
    iconBg: "bg-[#8A1C00]/20",
    comingSoon: true,
    subLinks: [
      { label: "Tournaments", icon: <Trophy className="h-3.5 w-3.5 text-cp-primary" /> },
      { label: "Rankings", icon: <Award className="h-3.5 w-3.5 text-[#DAF8E7]" /> },
      { label: "Equipment", icon: <Disc className="h-3.5 w-3.5 text-[#F0EFFF]" /> },
      { label: "History", icon: <Activity className="h-3.5 w-3.5 text-cp-muted" /> },
    ],
  },
  {
    name: "Badminton",
    slug: "badminton",
    entries: "8.1K ENTRIES",
    description:
      "BWF World Tour coverage, Olympic qualification point standings, and frame aerodynamics.",
    icon: <Activity className="h-4 w-4 text-[#0033C0]" />,
    iconBg: "bg-[#00228A]/25",
    comingSoon: true,
    subLinks: [
      { label: "Tournaments", icon: <Trophy className="h-3.5 w-3.5 text-cp-primary" /> },
      { label: "Rankings", icon: <Award className="h-3.5 w-3.5 text-[#DAF8E7]" /> },
      { label: "Equipment", icon: <Disc className="h-3.5 w-3.5 text-[#F0EFFF]" /> },
      { label: "Federations", icon: <Activity className="h-3.5 w-3.5 text-cp-muted" /> },
    ],
  },
  {
    name: "Billiards",
    slug: "billiards",
    entries: "3.5K ENTRIES",
    description:
      "Snooker, 8-ball, 9-ball rules parameters, cue deflection specifications, and pro brackets.",
    icon: <Disc className="h-4 w-4 text-[#621100]" />,
    iconBg: "bg-[#3D0700]/30",
    comingSoon: true,
    subLinks: [
      { label: "Tournaments", icon: <Trophy className="h-3.5 w-3.5 text-cp-primary" /> },
      { label: "Rankings", icon: <Award className="h-3.5 w-3.5 text-[#DAF8E7]" /> },
      { label: "Equipment", icon: <Disc className="h-3.5 w-3.5 text-[#F0EFFF]" /> },
      { label: "Rules", icon: <ShieldAlert className="h-3.5 w-3.5 text-[#B82800]" /> },
    ],
  },
  {
    name: "Running",
    slug: "running",
    entries: "21.5K ENTRIES",
    description:
      "Marathons registries, track events scheduling, midsole carbon plate shoe reviews, and plans.",
    icon: <Footprints className="h-4 w-4 text-[#4A6457]" />,
    iconBg: "bg-[#1C352A]/80",
    comingSoon: true,
    subLinks: [
      { label: "Events", icon: <Trophy className="h-3.5 w-3.5 text-cp-primary" /> },
      { label: "Leaderboards", icon: <Award className="h-3.5 w-3.5 text-[#DAF8E7]" /> },
      { label: "Gear", icon: <Disc className="h-3.5 w-3.5 text-[#F0EFFF]" /> },
      { label: "Training", icon: <Activity className="h-3.5 w-3.5 text-[#B82800]" /> },
    ],
  },
];

export default function SportsDirectory() {
  return (
    <section
      id="sports-databases"
      className="relative scroll-mt-20"
      aria-labelledby="sports-databases-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,71,255,0.08),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <FadeInView>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                more. Padel is live now — other sports are rolling out soon.
              </p>
            </div>
            <Link
              href={publicSportRoutes.sportHub("padel")}
              className="btn-interactive inline-flex w-fit shrink-0 items-center gap-1 rounded-lg border border-cp-primary/30 bg-cp-primary/10 px-4 py-2 text-sm font-semibold text-cp-primary transition-colors hover:border-cp-primary/50 hover:bg-cp-primary/15"
            >
              Explore Padel
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeInView>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {sportsDatabase.map((sport, index) => (
            <FadeInView key={sport.name} delay={index * 0.05}>
              <article
                className={cn(
                  "group flex h-full flex-col justify-between rounded-xl border p-5 transition-all duration-300 sm:p-6",
                  sport.active
                    ? "border-cp-primary/50 bg-cp-card shadow-[0_4px_24px_rgba(0,71,255,0.12)] ring-1 ring-cp-primary/20 hover:border-cp-primary/70 hover:shadow-[0_8px_32px_rgba(0,71,255,0.18)]"
                    : "border-cp-border bg-cp-card/60 hover:border-cp-border-subtle hover:bg-cp-card/90",
                )}
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2 gap-y-3 sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          sport.iconBg,
                        )}
                      >
                        {sport.icon}
                      </div>
                      <div className="min-w-0">
                        {sport.active ? (
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
                    <span className="shrink-0 rounded border border-cp-border bg-cp-bg px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cp-muted sm:px-2 sm:text-[10px]">
                      {sport.entries}
                    </span>
                  </div>

                  {sport.active && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cp-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cp-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-cp-primary" />
                      MVP · Live now
                    </span>
                  )}
                  {sport.comingSoon && (
                    <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-cp-text-dim">
                      Coming soon
                    </span>
                  )}

                  <p className="mt-3 text-sm leading-relaxed text-cp-muted">
                    {sport.description}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {sport.subLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={subLinkHref(sport.slug, link.label, sport.active)}
                      className={cn(
                        "btn-interactive flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium sm:px-3",
                        sport.active
                          ? "border-cp-border bg-cp-bg/80 text-cp-muted hover:border-cp-primary/30 hover:bg-cp-elevated hover:text-foreground"
                          : "pointer-events-none border-cp-border/60 bg-cp-bg/40 text-cp-text-dim",
                      )}
                    >
                      {link.icon}
                      <span className="truncate">{link.label}</span>
                    </Link>
                  ))}
                </div>

                {sport.active && (
                  <Link
                    href={publicSportRoutes.sportHub(sport.slug)}
                    className="btn-interactive mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cp-primary py-2.5 text-sm font-semibold text-white hover:bg-cp-primary-light"
                  >
                    Open {sport.name} database
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                )}
              </article>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
