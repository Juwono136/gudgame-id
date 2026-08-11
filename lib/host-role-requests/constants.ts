export const HOST_ROLE_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "revoked",
] as const;

export type HostRoleRequestStatus = (typeof HOST_ROLE_REQUEST_STATUSES)[number];

export const HOST_ROLE_REQUEST_MESSAGE_MAX = 1000;
export const HOST_ROLE_REJECTION_REASON_MAX = 500;
export const HOST_ROLE_REJECTION_REASON_MIN = 10;
