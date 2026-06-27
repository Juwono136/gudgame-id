/** Client-safe labels and copy for tournament invitations. */

export type AccessGrantRoleUi = "scorekeeper" | "bracket_manager";

export const ACCESS_GRANT_ROLES: {
  value: AccessGrantRoleUi;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "scorekeeper",
    label: "Scorekeeper",
    shortLabel: "Score",
    description: "Update live match scores only. Cannot change bracket setup.",
  },
  {
    value: "bracket_manager",
    label: "Bracket manager",
    shortLabel: "Bracket",
    description: "Generate bracket, assign teams, and score matches.",
  },
];

export function getAccessGrantRoleLabel(role: string): string {
  return ACCESS_GRANT_ROLES.find((r) => r.value === role)?.label ?? role.replace(/_/g, " ");
}

export function getInviteStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Active";
    case "accepted":
      return "Used";
    case "revoked":
      return "Removed";
    case "expired":
      return "Expired";
    default:
      return status.replace(/_/g, " ");
  }
}

export function isActiveInviteStatus(status: string): boolean {
  return status === "pending" || status === "accepted";
}
