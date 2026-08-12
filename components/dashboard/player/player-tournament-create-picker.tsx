"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [kind, setKind] = useState<TournamentCreateKind | null>(null);
  const canCreateOfficial = workspace === "host";

  if (kind === "fun_match") {
    return (
      <PlayerCreateReclubWizard workspace={workspace} onBack={() => setKind(null)} />
    );
  }

  return (
    <TournamentCreateKindHub
      variant={canCreateOfficial ? "host" : "player"}
      onSelect={(next) => {
        if (next === "official" && canCreateOfficial) {
          router.push(dashboardRoutes.hostTournamentsNew);
          return;
        }
        setKind(next);
      }}
      onBack={() => {
        router.push(dashboardRoutes.tournaments);
      }}
      backLabel="Back to my tournaments"
    />
  );
}
