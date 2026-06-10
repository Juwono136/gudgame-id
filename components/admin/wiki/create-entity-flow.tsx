"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { WikiEntityType } from "@/lib/domain/wiki";
import { EntityTypePicker } from "@/components/admin/wiki/entity-type-picker";
import { WikiEntityWizard } from "@/components/admin/wiki/wiki-entity-wizard";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import type { CreateEntityKind } from "@/lib/wiki/create-entity-kind";

type CreateEntityFlowProps = {
  sportSlug: string;
};

export function CreateEntityFlow({ sportSlug }: CreateEntityFlowProps) {
  const [kind, setKind] = useState<CreateEntityKind | null>(null);

  if (kind === "tournament") {
    return (
      <TournamentCreateWizard sportSlug={sportSlug} onBack={() => setKind(null)} />
    );
  }

  if (kind === "player" || kind === "gear") {
    return (
      <WikiEntityWizard
        sportSlug={sportSlug}
        mode="create"
        initialEntityType={kind as WikiEntityType}
        skipClassification
        onBackToClassification={() => setKind(null)}
      />
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Select entity classification
        </h2>
        <p className="mt-1 text-sm text-cp-muted">
          Each type uses a different form tailored to players, tournaments, or gear for{" "}
          <span className="font-medium capitalize text-cp-logo-accent">{sportSlug}</span>.
          Teams are created inside tournaments, not here.
        </p>
      </div>
      <EntityTypePicker
        value="player"
        onChange={(next) => setKind(next)}
      />
    </motion.section>
  );
}
