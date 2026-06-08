"use client";

import { motion } from "framer-motion";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type AuthSimpleShellProps = {
  formTitle: string;
  formSubtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Slightly wider card for reset password with two fields */
  wide?: boolean;
};

/**
 * Minimal auth layout — no hero imagery. Used for forgot / reset password flows.
 */
export function AuthSimpleShell({
  formTitle,
  formSubtitle,
  children,
  footer,
  wide = false,
}: AuthSimpleShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-cp-bg">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cp-border/60 px-4 py-4 sm:px-6">
        <BrandLogo size="md" href="/" />
        <ThemeToggle />
      </header>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          className={cn(
            "mx-auto w-full",
            wide ? "max-w-md sm:max-w-lg" : "max-w-[26rem] sm:max-w-md",
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-7">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {formTitle}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">{formSubtitle}</p>
            <div className="mt-5 sm:mt-6">{children}</div>
          </div>

          {footer ? (
            <div className="mt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
              {footer}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
