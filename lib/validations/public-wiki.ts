import { z } from "zod";
import { GEAR_CATEGORIES } from "@/lib/wiki/gear/constants";

export const publicPlayersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(20),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(["points", "name", "rank"]).default("points"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  gender: z.enum(["all", "male", "female"]).default("all"),
});

export type PublicPlayersListQuery = z.infer<typeof publicPlayersListQuerySchema>;

const gearCategoryFilter = z.enum(["all", ...GEAR_CATEGORIES]);

export const publicGearListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(12).max(48).default(24),
  search: z.string().trim().max(100).optional(),
  category: gearCategoryFilter.default("all"),
  sortBy: z.enum(["name", "price", "newest"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type PublicGearListQuery = z.infer<typeof publicGearListQuerySchema>;
