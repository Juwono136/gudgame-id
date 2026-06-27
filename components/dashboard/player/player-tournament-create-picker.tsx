"use client";

import { useState } from "react";
import { PlayerCreateReclubWizard } from "@/components/dashboard/player/player-create-reclub-wizard";
import {
  TournamentCreateKindHub,
  type TournamentCreateKind,
} from "@/components/tournaments/tournament-create-kind-hub";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { TournamentEditWorkspace } from "@/lib/tournaments/edit-routes";

type SportOption = { slug: string; name: string };

type PlayerTournamentCreatePickerProps = {
  sports: SportOption[];
  defaultSportSlug?: string;
  workspace?: TournamentEditWorkspace;
};

export function PlayerTournamentCreatePicker({
  sports,
  defaultSportSlug = "padel",
  workspace = "player",
}: PlayerTournamentCreatePickerProps) {
  const [kind, setKind] = useState<TournamentCreateKind | null>(null);

  if (kind === "fun_match") {
    return (
      <PlayerCreateReclubWizard
        sports={sports}
        defaultSportSlug={defaultSportSlug}
        workspace={workspace}
        onBack={() => setKind(null)}
      />
    );
  }

  return (
    <TournamentCreateKindHub
      variant="player"
      onSelect={setKind}
      onBack={() => {
        window.location.href = dashboardRoutes.tournaments;
      }}
      backLabel="Back to my tournaments"
    />
  );
}
