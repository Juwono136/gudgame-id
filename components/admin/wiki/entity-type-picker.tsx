"use client";

import { motion } from "framer-motion";
import { Package, Trophy, User } from "lucide-react";
import {
  CREATE_ENTITY_KIND_LABELS,
  type CreateEntityKind,
} from "@/lib/wiki/create-entity-kind";
import { cn } from "@/lib/utils";

const ICONS = {
  player: User,
  gear: Package,
  tournament: Trophy,
} as const;

const DESCRIPTIONS: Record<CreateEntityKind, string> = {
  player: "Editorial profiles you create here",
  gear: "Rackets, shoes, gloves & more",
  tournament: "Official or free reclub events",
};

type EntityTypePickerProps = {
  value: CreateEntityKind;
  onChange: (type: CreateEntityKind) => void;
  disabled?: boolean;
};

export function EntityTypePicker({ value, onChange, disabled }: EntityTypePickerProps) {
  const types: CreateEntityKind[] = ["player", "tournament", "gear"];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {types.map((type) => {
        const Icon = ICONS[type];
        const selected = value === type;
        return (
          <motion.button
            key={type}
            type="button"
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            onClick={() => onChange(type)}
            className={cn(
              "relative rounded-xl border p-5 text-left transition-colors",
              selected
                ? "border-cp-primary bg-cp-primary/10 shadow-[0_0_24px_var(--cp-primary-glow)]"
                : "border-cp-border bg-cp-card hover:border-cp-primary/40",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <Icon
              className={cn(
                "mb-3 h-8 w-8",
                selected ? "text-cp-primary" : "text-cp-muted",
              )}
            />
            <p className="font-semibold text-foreground">
              {CREATE_ENTITY_KIND_LABELS[type]}
            </p>
            <p className="mt-1 text-xs text-cp-muted">{DESCRIPTIONS[type]}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
