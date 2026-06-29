"use client";

import { FadeInView } from "@/components/motion/fade-in";
import { SportHubCard } from "@/components/sports/sport-hub-card";
import type { SportPublicCard } from "@/lib/sports/service";

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
              Sports List
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
