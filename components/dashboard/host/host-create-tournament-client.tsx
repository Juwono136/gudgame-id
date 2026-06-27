"use client";

import { useState } from "react";
import { TournamentCreateWizard } from "@/components/admin/tournaments/tournament-create-wizard";
import { PlayerCreateReclubWizard } from "@/components/dashboard/player/player-create-reclub-wizard";
import {
  TournamentCreateKindHub,
  type TournamentCreateKind,
} from "@/components/tournaments/tournament-create-kind-hub";
import { dashboardRoutes } from "@/lib/constants/routes";

type SportOption = { slug: string; name: string };

type HostCreateTournamentClientProps = {
  defaultSportSlug: string;
  sports: SportOption[];
};

export function HostCreateTournamentClient({
  defaultSportSlug,
  sports,
}: HostCreateTournamentClientProps) {
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
      <PlayerCreateReclubWizard
        sports={sports}
        defaultSportSlug={defaultSportSlug}
        workspace="host"
        onBack={() => setKind(null)}
      />
    );
  }

  return (
    <TournamentCreateWizard
      sportSlug={defaultSportSlug}
      mode="host"
      workspace="host"
      initialTournamentType="official"
      lockTournamentType
      onBack={() => setKind(null)}
    />
  );
}
