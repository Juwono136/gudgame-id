"use client";

import { ReclubTournamentWizard } from "@/components/tournaments/reclub/reclub-tournament-wizard";
import type { TournamentEditWorkspace } from "@/lib/tournaments/edit-routes";

type PlayerCreateReclubWizardProps = {
  workspace?: TournamentEditWorkspace;
  onBack?: () => void;
};

export function PlayerCreateReclubWizard({
  workspace = "player",
  onBack,
}: PlayerCreateReclubWizardProps) {
  return (
    <ReclubTournamentWizard workspace={workspace} onBack={onBack} />
  );
}
