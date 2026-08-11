import type { HostRoleRequestStatus } from "@/lib/host-role-requests/constants";

export type HostRoleRequestPublic = {
  id: string;
  status: HostRoleRequestStatus;
  message: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HostRoleRequestAdminItem = HostRoleRequestPublic & {
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  reviewedByUserId: string | null;
};
