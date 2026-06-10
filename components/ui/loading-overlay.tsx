"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
  className?: string;
};

export function LoadingOverlay({
  show,
  label = "Processing…",
  className,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-[2px]",
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
