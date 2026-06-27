"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type TournamentCreateKind = "official" | "fun_match";

type TournamentCreateKindHubProps = {
  onSelect: (kind: TournamentCreateKind) => void;
  onBack?: () => void;
  backLabel?: string;
  /** Player workspace — official is disabled */
  variant?: "host" | "player";
};

const OPTIONS: {
  kind: TournamentCreateKind;
  label: string;
  description: string;
  icon: typeof Trophy;
  accent: string;
}[] = [
  {
    kind: "official",
    label: "Official tournament",
    description:
      "Ranked events with full statistics. Choose paid or free registration in the next step.",
    icon: Trophy,
    accent: "border-cp-primary/40 bg-cp-primary/10 hover:border-cp-primary/60",
  },
  {
    kind: "fun_match",
    label: "Fun Match",
    description: "Free community play — lobby, squads, and casual rounds. Lighter stats.",
    icon: Gamepad2,
    accent: "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50",
  },
];

export function TournamentCreateKindHub({
  onSelect,
  onBack,
  backLabel = "Back to tournaments",
  variant = "host",
}: TournamentCreateKindHubProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </button>
      ) : null}

      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold text-foreground">Create tournament</h2>
        <p className="mt-2 text-sm text-cp-muted">
          Start with the event type. Official tournaments support paid or free entry; Fun Match
          sessions are always free.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPTIONS.map(({ kind, label, description, icon: Icon, accent }) => {
          const locked = variant === "player" && kind === "official";

          return (
            <motion.button
              key={kind}
              type="button"
              disabled={locked}
              whileHover={locked ? undefined : { scale: 1.01 }}
              whileTap={locked ? undefined : { scale: 0.99 }}
              onClick={() => !locked && onSelect(kind)}
              className={cn(
                "rounded-2xl border p-6 text-left transition-colors",
                accent,
                locked && "cursor-not-allowed opacity-50 grayscale",
              )}
            >
              <Icon className="mb-4 h-10 w-10 text-foreground" />
              <p className="text-lg font-semibold text-foreground">{label}</p>
              <p className="mt-2 text-sm leading-relaxed text-cp-muted">{description}</p>
              {locked ? (
                <p className="mt-3 text-xs font-medium text-amber-400/90">
                  Requires a host account
                </p>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
