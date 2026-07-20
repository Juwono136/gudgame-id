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
      return "Joined";
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

/** Client-safe copy for host invite management. */
export const INVITE_HOST_COPY = {
  validityDays: 7,
  staffInfo:
    "Generate reusable invite links or codes — anyone can accept while signed in for up to 7 days. After that the invite expires and you must generate a new one. You can create as many invites as you need.",
  playerInfo:
    "Invites are link or code only — valid up to 7 days and reusable by anyone until removed or expired. Generate as many as you need. After generate you can view or delete; credentials cannot be edited.",
} as const;
