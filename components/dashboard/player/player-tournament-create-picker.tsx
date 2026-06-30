"use client";

import { useState } from "react";
import { PlayerCreateReclubWizard } from "@/components/dashboard/player/player-create-reclub-wizard";
import {
  TournamentCreateKindHub,
  type TournamentCreateKind,
} from "@/components/tournaments/tournament-create-kind-hub";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { TournamentEditWorkspace } from "@/lib/tournaments/edit-routes";

type PlayerTournamentCreatePickerProps = {
  workspace?: TournamentEditWorkspace;
};

export function PlayerTournamentCreatePicker({
  workspace = "player",
}: PlayerTournamentCreatePickerProps) {
  const [kind, setKind] = useState<TournamentCreateKind | null>(null);

  if (kind === "fun_match") {
    return (
      <PlayerCreateReclubWizard workspace={workspace} onBack={() => setKind(null)} />
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
