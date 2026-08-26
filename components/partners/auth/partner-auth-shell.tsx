"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PartnerAuthShellProps = {
  partnerSlug: string;
  partnerName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  formTitle: string;
  formSubtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

export function PartnerAuthShell({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor = "#0d9488",
  formTitle,
  formSubtitle,
  children,
  footer,
  wide = false,
}: PartnerAuthShellProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col px-4 py-8 sm:px-6 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 opacity-40"
        style={{
          background: `radial-gradient(ellipse at top, ${primaryColor}33, transparent 70%)`,
        }}
        aria-hidden
      />

      <motion.div
        className={cn("mx-auto w-full", wide ? "max-w-lg" : "max-w-md")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            href={`/${partnerSlug}`}
            className="group flex flex-col items-center gap-2"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover shadow-md ring-1 ring-black/5 transition group-hover:ring-cp-primary/40 dark:ring-white/10"
              />
            ) : (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
                style={{ background: primaryColor }}
              >
                {partnerName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-semibold text-foreground">{partnerName}</span>
          </Link>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-cp-muted">
            Member account for this partner only
          </p>
        </div>

        <div className="rounded-2xl border border-cp-border/80 bg-cp-card p-5 shadow-sm sm:p-7">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {formTitle}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">{formSubtitle}</p>
          <div className="mt-5 sm:mt-6">{children}</div>
        </div>

        {footer ? (
          <div className="mt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-cp-muted">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
