"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

const popularTags = [
  { label: "Ale Galan", href: "/players" },
  { label: "Carbon Rackets", href: "/players" },
  { label: "WPT Master Final", href: "/news" },
] as const;

export default function Hero() {
  const pathname = usePathname();

  return (
    <section className="relative flex min-h-[min(82vh,640px)] items-center justify-center overflow-hidden px-4 py-12 sm:min-h-[min(85vh,700px)] sm:py-16 md:min-h-[min(80vh,720px)] md:py-16 lg:min-h-[min(88vh,760px)] lg:py-20">
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

      <div className="relative z-10 mx-auto w-full max-w-3xl px-1 text-center sm:px-0">
        <FadeIn mountKey={`hero-badge-${pathname}`} delay={0}>
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--cp-badge-border)] bg-[#1C352A]/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-[var(--cp-badge-green)] backdrop-blur-sm sm:px-4 sm:text-[11px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cp-badge-green)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--cp-badge-green)]" />
            </span>
            The Official Community Hub
          </div>
        </FadeIn>

        <FadeIn mountKey={`hero-title-${pathname}`} delay={0.08}>
          <h1 className="mt-6 text-3xl font-bold leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:text-5xl md:text-6xl">
            Master the Game.
            <br />
            <span className="text-gradient-primary">Know the Data.</span>
          </h1>
        </FadeIn>

        <FadeIn mountKey={`hero-desc-${pathname}`} delay={0.16}>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:mt-5 md:text-base lg:text-lg">
            Explore the definitive database for professional players, high-performance
            gear, and real-time tournament tracking.
          </p>
        </FadeIn>

        <FadeIn mountKey={`hero-search-${pathname}`} delay={0.24}>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto mt-7 flex w-full max-w-2xl flex-col gap-2 rounded-xl border border-cp-border bg-cp-card/70 p-2 backdrop-blur-md sm:mt-9 md:mt-10 md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-cp-muted" />
              <input
                type="search"
                placeholder="Search athletes, gear, tournaments..."
                className="w-full rounded-lg bg-transparent py-3.5 pr-4 pl-12 text-sm text-foreground placeholder:text-cp-muted focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="btn-interactive inline-flex items-center justify-center gap-2 rounded-lg bg-cp-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(0,71,255,0.4)] hover:bg-[#0033C0] hover:shadow-[0_6px_24px_rgba(0,71,255,0.5)]"
            >
              SEARCH
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </FadeIn>

        <FadeIn mountKey={`hero-tags-${pathname}`} delay={0.32}>
          <div className="mx-auto mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs backdrop-blur-sm sm:text-sm">
            <span className="font-medium text-white/90">Popular:</span>
              {popularTags.map((tag, i) => (
                <span key={tag.label} className="inline-flex items-center">
                  {i > 0 && <span className="mr-1 text-white/50">,</span>}
                  <Link
                    href={tag.href}
                    className="text-white/90 underline-offset-2 transition-colors hover:text-cp-logo-accent hover:underline"
                  >
                    {tag.label}
                  </Link>
                </span>
              ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
