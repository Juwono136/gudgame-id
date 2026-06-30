"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  LogIn,
  Search,
  Sparkles,
  Trophy,
  UserPlus,
  Compass,
} from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/client";
import { useSessionContext } from "@/hooks/use-session-context";
import { authRoutes, dashboardRoutes } from "@/lib/constants/routes";
import { resolveUserImageUrl } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  primary?: boolean;
};

export default function CTACommunity() {
  const { data: session } = useSession();
  const { data: sessionCtx } = useSessionContext(Boolean(session?.user));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isAuthenticated =
    hydrated && (Boolean(session?.user) || sessionCtx?.authenticated === true);
  const displayName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";
  const avatarSrc = resolveUserImageUrl(session?.user?.image);

  if (isAuthenticated) {
    const hasHostRole = sessionCtx?.roles.includes("host");

    const actions: QuickAction[] = [
      {
        href: dashboardRoutes.home,
        label: "My dashboard",
        description: "Stats, sessions, and profile",
        icon: LayoutDashboard,
        primary: true,
      },
      {
        href: "/search",
        label: "Wiki search",
        description: "Players, gear, and tournaments across sports",
        icon: Compass,
      },
      hasHostRole
        ? {
            href: dashboardRoutes.host,
            label: "Host workspace",
            description: "Tournaments, payments, and events",
            icon: Trophy,
          }
        : {
            href: dashboardRoutes.tournamentsNew,
            label: "Create Fun Match",
            description: "Start a casual session",
            icon: Sparkles,
          },
    ];

    return (
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-14 md:pb-16 lg:px-8">
        <FadeInView>
          <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-[var(--cp-shadow-card)]">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cp-primary/10 blur-3xl dark:bg-cp-primary/20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-500/8 blur-3xl"
              aria-hidden
            />

            <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-10">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-elevated sm:h-16 sm:w-16">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-cp-primary/10 text-lg font-bold text-cp-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cp-muted">
                    Welcome back
                  </p>
                  <h2 className="mt-1 break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                    {displayName}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-cp-muted sm:text-[15px]">
                    Jump back into your workspace, search the wiki, or pick a sport below.
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl lg:shrink-0 lg:grid-cols-3">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={cn(
                        "group flex min-h-[88px] flex-col justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                        action.primary
                          ? "border-cp-primary/35 bg-cp-primary text-white hover:bg-cp-primary-light"
                          : "border-cp-border bg-cp-elevated/40 hover:border-cp-primary/25 hover:bg-cp-elevated/70",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          action.primary ? "text-white/90" : "text-cp-primary",
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "text-sm font-semibold leading-snug",
                            action.primary ? "text-white" : "text-foreground",
                          )}
                        >
                          {action.label}
                        </p>
                        <p
                          className={cn(
                            "mt-1 line-clamp-2 text-xs leading-relaxed",
                            action.primary ? "text-white/75" : "text-cp-muted",
                          )}
                        >
                          {action.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="relative border-t border-cp-border/80 px-5 py-3 sm:px-8">
              <p className="text-xs text-cp-text-dim">
                Need something specific?{" "}
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1 font-semibold text-cp-primary hover:underline"
                >
                  <Search className="h-3.5 w-3.5" />
                  Open wiki search
                </Link>
              </p>
            </div>
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
