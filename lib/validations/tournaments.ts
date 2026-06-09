import { z } from "zod";
import { TOURNAMENT_STATUSES, TOURNAMENT_TYPES } from "@/db/schema/tournaments";

export const tournamentUpsertSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  summary: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(20000).optional().or(z.literal("")),
  status: z.enum(TOURNAMENT_STATUSES).default("draft"),
  tournamentType: z.enum(TOURNAMENT_TYPES),
  rules: z.string().trim().max(50000).optional().or(z.literal("")),
  venue: z.string().trim().max(200).optional().or(z.literal("")),
  startsAt: z.string().datetime().optional().or(z.literal("")),
  endsAt: z.string().datetime().optional().or(z.literal("")),
});

export type TournamentUpsertInput = z.infer<typeof tournamentUpsertSchema>;

export const tournamentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum([...TOURNAMENT_STATUSES, "all"] as const).default("all"),
  sortBy: z.enum(["startsAt", "name", "updated"]).default("startsAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type TournamentsListQuery = z.infer<typeof tournamentsListQuerySchema>;
