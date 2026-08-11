import { z } from "zod";
import {
  HOST_ROLE_REJECTION_REASON_MAX,
  HOST_ROLE_REJECTION_REASON_MIN,
  HOST_ROLE_REQUEST_MESSAGE_MAX,
  HOST_ROLE_REQUEST_STATUSES,
} from "@/lib/host-role-requests/constants";

export {
  HOST_ROLE_REJECTION_REASON_MAX,
  HOST_ROLE_REJECTION_REASON_MIN,
  HOST_ROLE_REQUEST_MESSAGE_MAX,
} from "@/lib/host-role-requests/constants";

export const createHostRoleRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .max(
      HOST_ROLE_REQUEST_MESSAGE_MAX,
      `Message must be at most ${HOST_ROLE_REQUEST_MESSAGE_MAX} characters`,
    )
    .optional()
    .default(""),
});

export const rejectHostRoleRequestSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(
      HOST_ROLE_REJECTION_REASON_MIN,
      `Please provide a reason (at least ${HOST_ROLE_REJECTION_REASON_MIN} characters)`,
    )
    .max(
      HOST_ROLE_REJECTION_REASON_MAX,
      `Reason must be at most ${HOST_ROLE_REJECTION_REASON_MAX} characters`,
    ),
});

export const listHostRoleRequestsQuerySchema = z.object({
  status: z.enum(HOST_ROLE_REQUEST_STATUSES).optional().default("pending"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().trim().max(120).optional().default(""),
});

export type CreateHostRoleRequestInput = z.infer<typeof createHostRoleRequestSchema>;
export type RejectHostRoleRequestInput = z.infer<typeof rejectHostRoleRequestSchema>;
