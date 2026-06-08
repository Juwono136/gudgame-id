"use client";

import { motion } from "framer-motion";
import { Package, User, Users } from "lucide-react";
import type { WikiEntityType } from "@/db/schema/wiki";
import { WIKI_ENTITY_TYPE_LABELS } from "@/lib/wiki/constants";
import { cn } from "@/lib/utils";

const ICONS = {
  player: User,
  team: Users,
  gear: Package,
} as const;

type EntityTypePickerProps = {
  value: WikiEntityType;
  onChange: (type: WikiEntityType) => void;
  disabled?: boolean;
};

export function EntityTypePicker({ value, onChange, disabled }: EntityTypePickerProps) {
  const types: WikiEntityType[] = ["player", "team", "gear"];

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
            <p className="font-semibold text-foreground">{WIKI_ENTITY_TYPE_LABELS[type]}</p>
            <p className="mt-1 text-xs text-cp-muted">
              {type === "player"
                ? "Pro & community athletes"
                : type === "team"
                  ? "Duos, squads & clubs"
                  : "Rackets, shoes, gloves & more"}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
