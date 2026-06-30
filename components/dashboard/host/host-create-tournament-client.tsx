"use client";

import { useState } from "react";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { PlayerCreateReclubWizard } from "@/components/dashboard/player/player-create-reclub-wizard";
import {
  TournamentCreateKindHub,
  type TournamentCreateKind,
} from "@/components/tournaments/tournament-create-kind-hub";
import { dashboardRoutes } from "@/lib/constants/routes";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";

export function HostCreateTournamentClient() {
  const { sportSlug } = useDashboardSport();
  const [kind, setKind] = useState<TournamentCreateKind | null>(null);

  if (!kind) {
    return (
      <TournamentCreateKindHub
        variant="host"
        onSelect={setKind}
        onBack={() => {
          window.location.href = dashboardRoutes.hostTournaments;
        }}
      />
    );
  }

  if (kind === "fun_match") {
    return (
      <PlayerCreateReclubWizard workspace="host" onBack={() => setKind(null)} />
    );
  }

  return (
    <TournamentCreateWizard
      sportSlug={sportSlug}
      mode="host"
      workspace="host"
      initialTournamentType="official"
      lockTournamentType
      onBack={() => setKind(null)}
    />
  );
}
