"use client";

import Link from "next/link";
import { FadeInView } from "@/components/motion/fade-in";
import { authRoutes } from "@/lib/constants/navigation";

export default function CTACommunity() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-14 md:pb-16 lg:px-8">
      <FadeInView>
        <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-linear-to-b from-cp-card/90 to-cp-bg px-5 py-8 text-center sm:px-10 sm:py-12 md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-cp-primary/25 blur-3xl"
            aria-hidden
          />

          <h2 className="relative text-xl font-bold tracking-tight text-foreground md:text-2xl lg:text-3xl">
            Join the Community
          </h2>
          <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-cp-muted sm:text-base">
            TandingBase is built by enthusiasts, for enthusiasts. Create an account to track
            your gear, follow your favorite pros, and contribute to the knowledge base.
          </p>

          <div className="relative mx-auto mt-6 sm:mt-8">
            <Link
              href={authRoutes.register}
              className="btn-interactive glow-primary inline-flex h-11 items-center justify-center rounded-lg bg-cp-primary px-8 text-sm font-semibold text-white hover:bg-[#0033C0]"
            >
              SIGN UP NOW
            </Link>
          </div>

          <p className="relative mt-5 text-xs text-cp-text-dim">
            ALREADY A HOST?{" "}
            <Link
              href={authRoutes.login}
              className="font-semibold text-cp-primary hover:text-cp-logo-accent hover:underline"
            >
              LOG IN HERE
            </Link>
          </p>
        </div>
      </FadeInView>
    </section>
  );
}
