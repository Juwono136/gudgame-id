"use client";

import { FadeInView } from "@/components/motion/fade-in";
import { SportHubCard } from "@/components/sports/sport-hub-card";
import type { SportPublicCard } from "@/lib/sports/service";
import type { HomepageSportsSectionSettings } from "@/lib/validations/homepage-settings";

type SportsDirectoryProps = {
  sports: SportPublicCard[];
  content?: HomepageSportsSectionSettings;
};

export default function SportsDirectory({ sports, content }: SportsDirectoryProps) {
  const liveCount = sports.filter((s) => s.isLive).length;
  const badgeText = content?.badgeText ?? "Choose your sport";
  const title = content?.title ?? "Sports List";
  const subtitle =
    content?.subtitle ??
    "Pick a discipline below to browse players, equipment, tournaments, and more.";
  const includeLiveCount = content?.includeLiveCount ?? true;
  const emptyStateText =
    content?.emptyStateText ?? "Sports databases are being configured. Check back soon.";

  const liveSuffix =
    includeLiveCount
      ? liveCount > 0
        ? ` ${liveCount} sport${liveCount === 1 ? "" : "s"} live now — more rolling out soon.`
        : " New sports are rolling out soon."
      : "";

  return (
    <section
      id="sports-databases"
      className="relative scroll-mt-20"
      aria-labelledby="sports-databases-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(10,158,118,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(61,186,150,0.08),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <FadeInView>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cp-primary">
              {badgeText}
            </p>
            <h2
              id="sports-databases-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-cp-muted sm:text-base">
              {subtitle}
              {liveSuffix}
            </p>
          </div>
        </FadeInView>

        {sports.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
            {emptyStateText}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 lg:gap-5">
            {sports.map((sport, index) => (
              <FadeInView key={sport.id} delay={index * 0.05}>
                <SportHubCard sport={sport} />
              </FadeInView>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
