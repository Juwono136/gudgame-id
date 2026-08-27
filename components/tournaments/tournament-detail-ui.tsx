"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  officialTabActiveClass,
  reclubTabActiveClass,
  statusBadgeClass,
} from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type TournamentHeroBannerProps = {
  coverImageUrl?: string | null;
  variant?: "official" | "reclub";
  children: ReactNode;
  /** Override inner content width (e.g. partner pages aligning to max-w-7xl chrome). */
  contentClassName?: string;
};

export function TournamentHeroBanner({
  coverImageUrl,
  variant = "official",
  children,
  contentClassName,
}: TournamentHeroBannerProps) {
  const isReclub = variant === "reclub";
  const coverGradient = cn(
    isReclub
      ? "from-cp-bg/70 via-cp-bg/35 to-cp-bg/90"
      : "from-cp-bg/65 via-cp-bg/30 to-cp-bg/88",
    isReclub
      ? "dark:from-cp-bg/70 dark:via-cp-bg/25 dark:to-cp-bg"
      : "dark:from-cp-bg/65 dark:via-cp-bg/20 dark:to-cp-bg",
  );
  const sideScrim = cn(
    isReclub
      ? "from-white/35 via-cp-bg/40 to-transparent"
      : "from-white/30 via-cp-bg/35 to-transparent",
    isReclub
      ? "dark:from-cp-bg/70 dark:via-cp-bg/30 dark:to-transparent"
      : "dark:from-cp-bg/65 dark:via-cp-bg/25 dark:to-transparent",
  );
  const fallbackGradient = isReclub
    ? "from-emerald-950/40 via-cp-card/70 to-cp-bg"
    : "from-cp-primary/25 via-cp-card/75 to-cp-bg";

  return (
    <div className="relative overflow-hidden border-b border-cp-border">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {coverImageUrl ? (
          <>
            <Image
              src={coverImageUrl}
              alt=""
              fill
              priority
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1152px"
              className="object-cover object-center"
              unoptimized
            />
            <div className="absolute inset-0 bg-white/20 dark:bg-black/40" />
            <div className={cn("absolute inset-0 bg-linear-to-b", coverGradient)} />
            <div className={cn("absolute inset-0 bg-linear-to-r", sideScrim)} />
          </>
        ) : (
          <div className={cn("absolute inset-0 bg-linear-to-b", fallbackGradient)} />
        )}
      </div>

      <div
        className={cn(
          "relative mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Shared high-contrast typography for tournament hero banners over cover images. */
export const tournamentHeroStyles = {
  backLink:
    "inline-flex items-center text-sm font-medium text-foreground/90 drop-shadow-sm transition-colors hover:text-foreground",
  title:
    "mt-3 break-words text-2xl font-bold tracking-tight text-foreground drop-shadow-md sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl",
  summaryWrap: cn(
    "mt-3 max-w-2xl text-base text-foreground/90 sm:text-lg",
    "[&_.rich-html]:max-h-[6.5rem] [&_.rich-html]:overflow-hidden",
    "[&_.rich-html_p]:my-1 [&_.rich-html_ul]:my-1 [&_.rich-html_ol]:my-1",
    "[&_.rich-html_ul]:list-disc [&_.rich-html_ol]:list-decimal [&_.rich-html_ul]:pl-5 [&_.rich-html_ol]:pl-5",
  ),
  /** Schedule + venue facts; calendar CTA sits below via metaActions. */
  metaRow: "mt-4 flex flex-col items-start gap-2.5 sm:mt-5",
  metaFacts:
    "flex w-full min-w-0 flex-col gap-2 text-sm font-medium text-foreground drop-shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2",
  metaActions: "flex w-full min-w-0 flex-wrap items-center gap-2",
  metaItem: "inline-flex min-w-0 items-center gap-1.5",
  metaIcon: "h-4 w-4 shrink-0 text-emerald-800 dark:text-cp-primary",
  /** Solid chip — apply AFTER status color classes so opaque bg wins over translucent pills. */
  statusBadge: cn(
    "border font-semibold uppercase tracking-wider shadow-sm",
    "border-slate-300/90 bg-white/95",
    "dark:border-white/20 dark:bg-cp-bg/75 dark:backdrop-blur-md",
  ),
} as const;

type TournamentTabNavProps<T extends string> = {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  variant?: "official" | "reclub";
  className?: string;
};

export function TournamentTabNav<T extends string>({
  tabs,
  active,
  onChange,
  variant = "official",
  className,
}: TournamentTabNavProps<T>) {
  const isReclub = variant === "reclub";

  return (
    <div
      className={cn(
        "-mx-1 flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              isActive
                ? isReclub
                  ? reclubTabActiveClass
                  : officialTabActiveClass
                : "text-cp-muted hover:bg-cp-elevated/60 hover:text-foreground",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

type TournamentDetailSectionProps = {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
  headerAside?: ReactNode;
};

export function TournamentDetailSection({
  title,
  icon: Icon,
  iconClassName,
  children,
  className,
  headerAside,
}: TournamentDetailSectionProps) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
          {Icon ? <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} aria-hidden /> : null}
          {title}
        </h2>
        {headerAside}
      </div>
      <div className="mt-3 sm:mt-4">{children}</div>
    </section>
  );
}

type TournamentStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  variant?: "official" | "reclub";
  tone?: "default" | "hero";
};

export function TournamentStatCard({
  icon: Icon,
  label,
  value,
  variant = "reclub",
  tone = "default",
}: TournamentStatCardProps) {
  const iconColor =
    variant === "reclub"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-emerald-800 dark:text-cp-primary";
  const isHero = tone === "hero";

  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5",
        isHero
          ? "border-slate-300/80 bg-white/90 backdrop-blur-sm dark:border-white/10 dark:bg-cp-bg/55"
          : "border-cp-border/80 bg-cp-card/70",
      )}
    >
      <Icon className={cn("h-4 w-4", iconColor)} aria-hidden />
      <p
        className={cn(
          "mt-2 truncate text-[11px] font-medium uppercase tracking-wide sm:text-xs",
          isHero ? "text-foreground/75" : "text-cp-muted",
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-bold text-foreground sm:text-lg">{value}</p>
    </div>
  );
}

export function TournamentDetailPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen min-w-0 overflow-x-clip bg-cp-bg", className)}>{children}</div>
  );
}

export function TournamentDetailBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Overview info tile shared by Official + Partner public pages. */
export function TournamentInfoCard({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-cp-primary">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wider sm:text-xs">
          {title}
        </span>
      </div>
      <p className="mt-2.5 break-words text-base font-bold leading-snug text-foreground sm:mt-3 sm:text-lg">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 break-words text-xs leading-relaxed text-cp-muted sm:text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
