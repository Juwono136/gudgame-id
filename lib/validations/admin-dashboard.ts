import { z } from "zod";

export const ADMIN_DASHBOARD_RANGES = ["week", "month", "year"] as const;
export type AdminDashboardRange = (typeof ADMIN_DASHBOARD_RANGES)[number];

export const adminDashboardQuerySchema = z.object({
  range: z.enum(ADMIN_DASHBOARD_RANGES).default("month"),
});

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
