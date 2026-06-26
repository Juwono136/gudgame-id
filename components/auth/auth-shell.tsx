"use client";

import Image from "next/image";
import { Gauge } from "lucide-react";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { siteConfig } from "@/lib/config";
import {
  authBackgrounds,
  type AuthShellVariant,
} from "@/lib/constants/auth-backgrounds";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  variant: AuthShellVariant;
  formTitle: string;
  formSubtitle: string;
  /** Wider form column for long sign-up flows */
  formSize?: "default" | "wide";
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const heroCopy: Record<
  AuthShellVariant,
  { title: string; subtitle: string; proTip: string }
> = {
  login: {
    title: siteConfig.shortName,
    subtitle:
      "Performance data for court sports. Master your game with precision analytics, player profiles, and community wiki knowledge.",
    proTip:
      "The difference between a good player and a great player is tactical awareness. Data is your ultimate partner on court.",
  },
  register: {
    title: `Join ${siteConfig.shortName}`,
    subtitle:
      "Contribute to the wiki, verify your player identity, and connect with padel-first communities across the region.",
    proTip:
      "Verified hosts help keep gear reviews and tournament data accurate for everyone in the ecosystem.",
  },
};

export function AuthShell({
  variant,
  formTitle,
  formSubtitle,
  formSize = "default",
  children,
  footer,
}: AuthShellProps) {
  const bg = authBackgrounds[variant];
  const hero = heroCopy[variant];
  const isWide = formSize === "wide";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cp-bg max-lg:min-h-[100dvh] lg:fixed lg:inset-0 lg:flex-row lg:overflow-hidden">
      {/* —— Left hero (desktop only) —— */}
      <div className="relative hidden w-full lg:flex lg:h-full lg:w-1/2 lg:shrink-0 lg:overflow-hidden">
        <Image
          src={bg}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0B0E14]/92 via-[#0B0E14]/75 to-[#0047FF]/25"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-full w-full flex-col justify-between p-8 xl:p-12">
          <div>
            <BrandLogo size="lg" inverted />

            <motion.h1
              className="mt-12 max-w-lg text-3xl font-bold leading-tight tracking-tight text-white xl:mt-14 xl:text-[2.65rem]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {hero.title}
            </motion.h1>
            <motion.p
              className="mt-4 max-w-lg text-base leading-relaxed text-slate-300"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
            >
              {hero.subtitle}
            </motion.p>
          </div>

          <motion.div
            className="max-w-md rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#DAF8E7]">
              <Gauge className="h-4 w-4 text-cp-primary" />
              Pro tip
            </div>
            <p className="mt-2 text-sm italic leading-relaxed text-slate-300">
              &ldquo;{hero.proTip}&rdquo;
            </p>
          </motion.div>
        </div>
      </div>

      {/* —— Right: mobile header + form (no background image on small screens) —— */}
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col lg:h-full lg:w-1/2 lg:overflow-y-auto",
          isWide ? "lg:overscroll-y-contain" : "lg:items-center lg:justify-center",
        )}
        style={isWide ? { scrollPaddingBottom: "2.5rem" } : undefined}
      >
        {/* Mobile / tablet: simple top bar — logo only, solid background */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cp-border/60 bg-cp-bg/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:hidden">
          <BrandLogo size="md" href="/" />
          <ThemeToggle />
        </header>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:w-full lg:max-w-none lg:px-10 lg:py-10 xl:px-14",
            !isWide && "lg:items-center lg:justify-center lg:py-12",
          )}
        >
          <motion.div
            className={cn(
              "mx-auto w-full shrink-0",
              isWide
                ? "max-w-2xl pb-8 sm:pb-10 xl:max-w-3xl"
                : "max-w-[26rem] pb-6 sm:max-w-md lg:max-w-[28rem] lg:pb-8",
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className={cn(
                "rounded-2xl border border-cp-border bg-cp-card cp-shadow-card",
                "p-5 sm:p-7",
                isWide && "lg:p-8",
              )}
            >
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {formTitle}
              </h2>
              <p className="mt-1 text-sm text-cp-muted">{formSubtitle}</p>
              <div className="mt-5 sm:mt-6">{children}</div>
            </div>

            {footer ? (
              <div className="mt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center sm:mt-5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
