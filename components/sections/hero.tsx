"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { GlobalSearchBox } from "@/components/search/global-search-box";

export default function Hero() {
  const pathname = usePathname();

  return (
    <section className="relative z-10 min-h-[min(42vh,380px)] sm:min-h-[min(44vh,420px)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/images/bg-03.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center brightness-[0.92] contrast-[1.02] saturate-[0.95] dark:brightness-[0.72] dark:contrast-100 dark:saturate-100"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-linear-to-b from-white/92 via-white/78 to-cp-bg dark:from-black/70 dark:via-black/55 dark:to-cp-bg"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[var(--cp-hero-overlay)]/8 dark:bg-[var(--cp-hero-overlay)]/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(0,191,139,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(0,191,139,0.22),transparent)]"
          aria-hidden
        />
      </div>

      <div className="relative flex min-h-[inherit] items-center overflow-visible">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-xl text-center lg:text-left">
              <FadeIn mountKey={`hero-badge-${pathname}`} delay={0}>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-emerald-800 backdrop-blur-sm sm:px-4 sm:text-[11px] dark:border-[var(--cp-badge-border)] dark:bg-[#1C352A]/80 dark:text-[var(--cp-badge-green)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60 dark:bg-[var(--cp-badge-green)]" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-[var(--cp-badge-green)]" />
                  </span>
                  The Official Community Hub
                </div>
              </FadeIn>

              <FadeIn mountKey={`hero-title-${pathname}`} delay={0.06}>
                <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-cp-text drop-shadow-[0_1px_12px_rgba(255,255,255,0.65)] sm:text-3xl md:text-[2rem] dark:text-white dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)]">
                  Master the Game.{" "}
                  <span className="text-gradient-primary">Know the Data.</span>
                </h1>
              </FadeIn>

              <FadeIn mountKey={`hero-desc-${pathname}`} delay={0.12}>
                <p className="mt-2 text-sm leading-relaxed text-cp-muted sm:mt-3 sm:text-[15px] dark:text-slate-300 dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
                  Player profiles, gear specs, and tournament coverage — all in one
                  place.
                </p>
              </FadeIn>
            </div>

            <div className="relative z-20 w-full lg:max-w-md lg:shrink-0">
              <FadeIn mountKey={`hero-search-${pathname}`} delay={0.18}>
                <GlobalSearchBox
                  variant="hero"
                  className="shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                />
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
