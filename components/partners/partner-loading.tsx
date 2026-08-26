"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PartnerLoadingSpinnerProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

/** Partner-scoped spinner — avoids Gud Game PageLoader branding. */
export function PartnerLoadingSpinner({
  className,
  label,
  size = "md",
}: PartnerLoadingSpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin text-cp-primary", sizeClass[size])} />
      {label ? <span className="text-xs text-cp-muted">{label}</span> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

type PartnerLoadingOverlayProps = {
  show: boolean;
  label?: string;
  className?: string;
  /** `local` = parent-relative; `fullscreen` = fixed viewport (mutations). */
  variant?: "local" | "fullscreen";
};

/** Overlay for partner forms / directories — uses partner accent, not Gud Game logo. */
export function PartnerLoadingOverlay({
  show,
  label = "Loading…",
  className,
  variant = "local",
}: PartnerLoadingOverlayProps) {
  if (variant === "fullscreen") {
    return (
      <AnimatePresence>
        {show ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-[2px]",
              className,
            )}
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-cp-border bg-cp-card px-8 py-6 shadow-xl"
            >
              <Loader2 className="h-8 w-8 animate-spin text-cp-primary" />
              <p className="text-sm font-medium text-foreground">{label}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  }

  if (!show) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-cp-card/70 backdrop-blur-[2px]",
        className,
      )}
      aria-busy
      aria-live="polite"
    >
      <PartnerLoadingSpinner label={label} size="lg" />
    </div>
  );
}

/** Soft overlay while a list refetches in the background. */
export function PartnerListFetchingOverlay({ label = "Updating list…" }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-cp-bg/60 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-xl border border-cp-border bg-cp-card px-4 py-2.5 text-sm text-foreground shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin text-cp-primary" />
        {label}
      </div>
    </div>
  );
}

export function PartnerPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center px-4">
      <PartnerLoadingSpinner label={label} size="lg" />
    </div>
  );
}
