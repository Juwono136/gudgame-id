"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

export default function Hero() {
  const pathname = usePathname();

  return (
    <section className="relative min-h-[min(42vh,380px)] overflow-hidden sm:min-h-[min(44vh,420px)]">
      <Image
        src="/images/bg-03.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-cp-bg"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[var(--cp-hero-overlay)]/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(0,71,255,0.22),transparent)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[inherit] items-center">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-xl text-center lg:text-left">
              <FadeIn mountKey={`hero-badge-${pathname}`} delay={0}>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-widest backdrop-blur-sm sm:px-4 sm:text-[11px] border-emerald-600/30 bg-emerald-500/12 text-emerald-800 dark:border-[var(--cp-badge-border)] dark:bg-[#1C352A]/80 dark:text-[var(--cp-badge-green)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60 dark:bg-[var(--cp-badge-green)]" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-[var(--cp-badge-green)]" />
                  </span>
                  The Official Community Hub
                </div>
              </FadeIn>

              <FadeIn mountKey={`hero-title-${pathname}`} delay={0.06}>
                <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:text-3xl md:text-[2rem]">
                  Master the Game.{" "}
                  <span className="text-gradient-primary">Know the Data.</span>
                </h1>
              </FadeIn>

              <FadeIn mountKey={`hero-desc-${pathname}`} delay={0.12}>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:mt-3 sm:text-[15px]">
                  Player profiles, gear specs, and tournament coverage — all in one
                  place.
                </p>
              </FadeIn>
            </div>

            <div className="w-full lg:max-w-md lg:shrink-0">
              <FadeIn mountKey={`hero-search-${pathname}`} delay={0.18}>
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="flex w-full flex-col gap-2 rounded-xl border border-cp-border bg-cp-card/70 p-1.5 backdrop-blur-md sm:flex-row sm:items-center sm:p-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cp-muted" />
                    <input
                      type="search"
                      placeholder="Search athletes, gear, tournaments..."
                      className="w-full rounded-lg bg-transparent py-2.5 pr-3 pl-10 text-sm text-foreground placeholder:text-cp-muted focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-interactive inline-flex items-center justify-center gap-1.5 rounded-lg bg-cp-primary px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_20px_rgba(0,71,255,0.4)] hover:bg-[#0033C0] hover:shadow-[0_6px_24px_rgba(0,71,255,0.5)] sm:text-sm"
                  >
                    Search
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
