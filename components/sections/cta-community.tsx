"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, LogIn, Search, UserPlus } from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/client";
import { useSessionContext } from "@/hooks/use-session-context";
import { authRoutes, dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";

export default function CTACommunity() {
  const { data: session } = useSession();
  const { data: sessionCtx } = useSessionContext(Boolean(session?.user));

  const isAuthenticated =
    Boolean(session?.user) || sessionCtx?.authenticated === true;
  const displayName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  if (isAuthenticated) {
    const hasHostRole = sessionCtx?.roles.includes("host");

    return (
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-14 md:pb-16 lg:px-8">
        <FadeInView>
          <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-linear-to-b from-cp-card/90 to-cp-bg px-5 py-8 sm:px-10 sm:py-12 md:px-12 md:py-14">
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-cp-primary/25 blur-3xl"
              aria-hidden
            />

            <h2 className="relative text-xl font-bold tracking-tight text-foreground md:text-2xl lg:text-3xl">
              Welcome back, {displayName}
            </h2>
            <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-cp-muted sm:text-base">
              Jump back into your workspace, browse the wiki, or explore live tournaments.
            </p>

            <div className="relative mx-auto mt-6 flex max-w-2xl flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button asChild className="h-11 bg-cp-primary hover:bg-cp-primary-light">
                <Link href={dashboardRoutes.home}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Player overview
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-cp-border">
                <Link href={publicSportRoutes.players("padel")}>
                  Browse players
                </Link>
              </Button>
              {hasHostRole ? (
                <Button asChild variant="outline" className="h-11 border-cp-border">
                  <Link href={dashboardRoutes.host}>
                    Host workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="h-11 border-cp-border">
                  <Link href={dashboardRoutes.tournamentsNew}>
                    Create Fun Match
                  </Link>
                </Button>
              )}
            </div>

            <p className="relative mt-5 text-xs text-cp-text-dim">
              Need something specific?{" "}
              <Link href="/search" className="inline-flex items-center gap-1 font-semibold text-cp-primary hover:underline">
                <Search className="h-3.5 w-3.5" />
                Open wiki search
              </Link>
            </p>
          </div>
        </FadeInView>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-14 md:pb-16 lg:px-8">
      <FadeInView>
        <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-linear-to-b from-cp-card/90 to-cp-bg px-5 py-8 sm:px-10 sm:py-12 md:px-12 md:py-14">
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

          <div className="relative mx-auto mt-6 flex max-w-md flex-col gap-2 sm:mt-8 sm:flex-row sm:justify-center">
            <Button asChild className="h-11 bg-cp-primary hover:bg-cp-primary-light">
              <Link href={authRoutes.register}>
                <UserPlus className="mr-2 h-4 w-4" />
                Sign up now
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 border-cp-border">
              <Link href={authRoutes.login}>
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Link>
            </Button>
          </div>

          <p className="relative mt-5 text-xs text-cp-text-dim">
            Already hosting events?{" "}
            <Link
              href={authRoutes.login}
              className="font-semibold text-cp-primary hover:text-cp-logo-accent hover:underline"
            >
              Log in to your host workspace
            </Link>
          </p>
        </div>
      </FadeInView>
    </section>
  );
}
