import type { WikiEntityType } from "@/db/schema/wiki";

export type WikiWizardStep = { id: string; label: string };

export type WikiWizardStepId =
  | "classification"
  | "source"
  | "profile"
  | "product"
  | "performance"
  | "specs"
  | "roster"
  | "media"
  | "review";

export type EntityWizardConfig = {
  entityType: WikiEntityType;
  steps: WikiWizardStep[];
  stepIds: WikiWizardStepId[];
};

const PLAYER_CONFIG: EntityWizardConfig = {
  entityType: "player",
  steps: [
    { id: "classification", label: "Classification" },
    { id: "profile", label: "Player profile" },
    { id: "review", label: "Review" },
  ],
  stepIds: ["classification", "profile", "review"],
};

const TEAM_CONFIG: EntityWizardConfig = {
  entityType: "team",
  steps: [
    { id: "classification", label: "Classification" },
    { id: "profile", label: "Team profile" },
    { id: "performance", label: "Performance" },
    { id: "roster", label: "Roster" },
    { id: "review", label: "Review" },
  ],
  stepIds: ["classification", "profile", "performance", "roster", "review"],
};

const GEAR_CONFIG: EntityWizardConfig = {
  entityType: "gear",
  steps: [
    { id: "classification", label: "Classification" },
    { id: "source", label: "Data source" },
    { id: "product", label: "Product" },
    { id: "specs", label: "Specs & ratings" },
    { id: "review", label: "Review" },
  ],
  stepIds: ["classification", "source", "product", "specs", "review"],
};

export function getEntityWizardConfig(entityType: WikiEntityType): EntityWizardConfig {
  switch (entityType) {
    case "player":
      return PLAYER_CONFIG;
    case "team":
      return TEAM_CONFIG;
    case "gear":
      return GEAR_CONFIG;
  }
}

export type GearEntryMode = "manual" | "catalog";
