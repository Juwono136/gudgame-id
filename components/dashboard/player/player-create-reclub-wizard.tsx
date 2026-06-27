"use client";

import { ReclubTournamentWizard } from "@/components/tournaments/reclub/reclub-tournament-wizard";
import type { TournamentEditWorkspace } from "@/lib/tournaments/edit-routes";

type SportOption = { slug: string; name: string };

type PlayerCreateReclubWizardProps = {
  sports: SportOption[];
  defaultSportSlug?: string;
  workspace?: TournamentEditWorkspace;
  onBack?: () => void;
};

export function PlayerCreateReclubWizard({
  sports,
  defaultSportSlug = "padel",
  workspace = "player",
  onBack,
}: PlayerCreateReclubWizardProps) {
  return (
    <ReclubTournamentWizard
      sports={sports}
      defaultSportSlug={defaultSportSlug}
      workspace={workspace}
      onBack={onBack}
    />
  );
}
