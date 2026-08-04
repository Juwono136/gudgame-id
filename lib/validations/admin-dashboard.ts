import { z } from "zod";

export const ADMIN_DASHBOARD_RANGES = ["week", "month", "year", "custom"] as const;
export type AdminDashboardRange = (typeof ADMIN_DASHBOARD_RANGES)[number];

/** Preset chips shown in the UI (custom opens the date picker). */
export const ADMIN_DASHBOARD_PRESET_RANGES = ["week", "month", "year", "custom"] as const;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00`)), "Invalid date");

/** Max custom window — keeps chart series and DB scans bounded. */
export const ADMIN_DASHBOARD_MAX_CUSTOM_DAYS = 730;

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export const adminDashboardQuerySchema = z
  .object({
    range: z.enum(ADMIN_DASHBOARD_RANGES).default("month"),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.range !== "custom") return;

    if (!data.from || !data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom range requires both from and to dates",
        path: data.from ? ["to"] : ["from"],
      });
      return;
    }

    if (data.from > data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be on or before to date",
        path: ["from"],
      });
      return;
    }

    const span = daysBetween(data.from, data.to);
    if (span > ADMIN_DASHBOARD_MAX_CUSTOM_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Custom range cannot exceed ${ADMIN_DASHBOARD_MAX_CUSTOM_DAYS} days`,
        path: ["to"],
      });
    }
  });

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;

export type AdminDashboardQueryInput = {
  range: AdminDashboardRange;
  from?: string;
  to?: string;
};
