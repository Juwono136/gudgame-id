"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type TournamentCreateKind = "official" | "reclub";

type TournamentCreateKindPickerProps = {
  sportSlug: string;
  onSelect: (kind: TournamentCreateKind) => void;
  onBack: () => void;
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
    description: "Paid registration, ranked bracket play, and platform fees.",
    icon: Trophy,
    accent: "border-cp-primary/40 bg-cp-primary/10 hover:border-cp-primary/60",
  },
  {
    kind: "reclub",
    label: "Fun Match",
    description: "Free community play — lobby, squads, and casual rounds.",
    icon: Gamepad2,
    accent: "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50",
  },
];

export function TournamentCreateKindPicker({
  sportSlug,
  onSelect,
  onBack,
}: TournamentCreateKindPickerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-5"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center text-sm text-cp-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Change classification
      </button>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Choose tournament type</h2>
        <p className="mt-1 text-sm text-cp-muted">
          Create an official paid event or a free Fun Match for{" "}
          <span className="font-medium capitalize text-cp-logo-accent">{sportSlug}</span>.
          Same options available to hosts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ kind, label, description, icon: Icon, accent }) => (
          <motion.button
            key={kind}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect(kind)}
            className={cn(
              "rounded-xl border p-5 text-left transition-colors",
              accent,
            )}
          >
            <Icon className="mb-3 h-8 w-8 text-foreground" />
            <p className="font-semibold text-foreground">{label}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-cp-muted">{description}</p>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
