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

          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative mx-auto mt-6 flex w-full max-w-md flex-col gap-2 sm:mt-8 md:max-w-lg md:flex-row md:items-stretch lg:max-w-md"
          >
            <input
              type="email"
              required
              placeholder="Enter your email address"
              className="h-11 flex-1 rounded-lg border border-cp-border bg-cp-bg-input px-4 text-sm text-foreground placeholder:text-cp-muted transition-colors focus:border-cp-primary focus:outline-none focus:ring-1 focus:ring-cp-primary/40"
            />
            <Link
              href="/register"
              className="btn-interactive glow-primary inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-cp-primary px-6 text-sm font-semibold text-white hover:bg-[#0033C0]"
            >
              SIGN UP NOW
            </Link>
          </form>

          <p className="relative mt-5 text-xs text-cp-text-dim">
            ALREADY A CONTRIBUTOR?{" "}
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
