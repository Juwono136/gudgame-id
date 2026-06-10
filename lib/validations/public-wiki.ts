import { z } from "zod";

export const publicPlayersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(20),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(["points", "name", "rank"]).default("points"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  gender: z.enum(["all", "male", "female"]).default("all"),
});

export type PublicPlayersListQuery = z.infer<typeof publicPlayersListQuerySchema>;
