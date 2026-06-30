"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { WikiEntityType } from "@/lib/domain/wiki";
import { EntityTypePicker } from "@/components/admin/wiki/entity-type-picker";
import { WikiEntityWizard } from "@/components/admin/wiki/wiki-entity-wizard";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import {
  TournamentCreateKindPicker,
  type TournamentCreateKind,
} from "@/components/admin/wiki/tournament-create-kind-picker";
import { ReclubTournamentWizard } from "@/components/tournaments/reclub/reclub-tournament-wizard";
import type { CreateEntityKind } from "@/lib/wiki/create-entity-kind";

type CreateEntityFlowProps = {
  sportSlug: string;
};

export function CreateEntityFlow({ sportSlug }: CreateEntityFlowProps) {
  const [kind, setKind] = useState<CreateEntityKind | null>(null);
  const [tournamentKind, setTournamentKind] = useState<TournamentCreateKind | null>(null);

  if (kind === "tournament" && tournamentKind === "official") {
    return (
      <TournamentCreateWizard
        sportSlug={sportSlug}
        onBack={() => setTournamentKind(null)}
        initialTournamentType="official"
        lockTournamentType
      />
    );
  }

  if (kind === "tournament" && tournamentKind === "reclub") {
    return (
      <ReclubTournamentWizard
        sportSlug={sportSlug}
        workspace="admin"
        onBack={() => setTournamentKind(null)}
      />
    );
  }

  if (kind === "tournament") {
    return (
      <TournamentCreateKindPicker
        sportSlug={sportSlug}
        onSelect={setTournamentKind}
        onBack={() => setKind(null)}
      />
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
        <p className="mt-2 rounded-lg border border-cp-border/80 bg-cp-elevated/40 px-3 py-2 text-xs leading-relaxed text-cp-muted sm:text-sm">
          <span className="font-medium text-foreground">Player profiles:</span> only athletes you
          create in this console appear in your wiki database. Players who sign up through the app
          manage their own profiles in My Settings and cannot be edited here.
        </p>
      </div>
      <EntityTypePicker
        value="player"
        onChange={(next) => setKind(next)}
      />
    </motion.section>
  );
}
