import { z } from "zod";
import { DEFAULT_SPORT_MODULES, SPORT_VISIBILITY } from "@/db/schema/sports";

const sportModulesSchema = z.object({
  tournaments: z.boolean(),
  players: z.boolean(),
  gear: z.boolean(),
  rankings: z.boolean(),
  rules: z.boolean(),
});

export const sportUpsertSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(50),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  rulesSummary: z.string().trim().max(100_000).optional().or(z.literal("")),
  rulesContent: z.string().trim().max(50_000).optional().or(z.literal("")),
  howToPlay: z.string().trim().max(50_000).optional().or(z.literal("")),
  equipmentOverview: z.string().trim().max(10_000).optional().or(z.literal("")),
  accentColor: z.string().trim().max(32).optional().or(z.literal("")),
  visibility: z.enum(SPORT_VISIBILITY),
  modules: sportModulesSchema.default(DEFAULT_SPORT_MODULES),
  isActive: z.boolean(),
});

export type SportUpsertInput = z.infer<typeof sportUpsertSchema>;

export const sportsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  visibility: z.enum([...SPORT_VISIBILITY, "all"] as const).default("all"),
  status: z.enum(["all", "active", "inactive"] as const).default("all"),
  sortBy: z.enum(["displayOrder", "name", "updated"]).default("displayOrder"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type AdminSportsListQuery = z.infer<typeof sportsListQuerySchema>;

export const sportsReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
