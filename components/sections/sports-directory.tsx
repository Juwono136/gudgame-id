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
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:py-16 lg:px-8">
      <FadeInView>
        <div className="flex flex-col gap-3 border-b border-cp-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Sports Databases
          </h2>
          <Link
            href={publicSportRoutes.sportHub("padel")}
            className="btn-interactive inline-flex w-fit items-center gap-1 text-sm font-semibold text-cp-primary hover:text-cp-logo-accent"
          >
            EXPLORE ALL
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </FadeInView>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {sportsDatabase.map((sport, index) => (
          <FadeInView key={sport.name} delay={index * 0.06}>
            <article
              className={cn(
                "group flex h-full flex-col justify-between rounded-xl border bg-cp-card/50 p-5 backdrop-blur-sm transition-all duration-300 sm:p-6",
                sport.active
                  ? "border-cp-primary/40 hover:border-cp-primary/70 hover:shadow-[0_0_24px_rgba(0,71,255,0.12)]"
                  : "border-cp-border hover:border-cp-border-subtle hover:bg-cp-card/90",
              )}
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 gap-y-3 sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        sport.iconBg,
                      )}
                    >
                      {sport.icon}
                    </div>
                    <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-cp-primary sm:text-lg">
                      {sport.name}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded border border-cp-border bg-cp-bg px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cp-muted sm:px-2 sm:text-[10px]">
                    {sport.entries}
                  </span>
                </div>

                {sport.active && (
                  <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-cp-primary">
                    MVP · Live now
                  </span>
                )}
                {sport.comingSoon && (
                  <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                    Coming soon
                  </span>
                )}

                <p className="mt-3 min-h-0 text-sm leading-relaxed text-cp-muted md:min-h-[3.25rem] lg:min-h-[3.5rem]">
                  {sport.description}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {sport.subLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={subLinkHref(sport.slug, link.label, sport.active)}
                    className={cn(
                      "btn-interactive flex items-center gap-2 rounded-lg border border-cp-border bg-cp-bg/50 px-2.5 py-2 text-xs font-medium text-cp-muted sm:px-3",
                      sport.active
                        ? "hover:border-cp-primary/30 hover:bg-cp-elevated hover:text-foreground"
                        : "pointer-events-none text-cp-text-dim",
                    )}
                  >
                    {link.icon}
                    <span className="truncate">{link.label}</span>
                  </Link>
                ))}
              </div>
            </article>
          </FadeInView>
        ))}
      </div>
    </section>
  );
}
