import { z } from "zod";

const listBaseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(100).optional().or(z.literal("")),
});

export const playerMatchesListQuerySchema = listBaseSchema.extend({
  result: z.enum(["all", "win", "loss"]).default("all"),
  type: z.enum(["all", "official", "recreational"]).default("all"),
  year: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.number().int().min(1990).max(2100).optional(),
  ),
  sortBy: z.enum(["playedAt", "tournament"]).default("playedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type PlayerMatchesListQuery = z.infer<typeof playerMatchesListQuerySchema>;

export const playerTournamentsListQuerySchema = listBaseSchema.extend({
  scope: z.enum(["all", "created", "joined"]).default("created"),
  year: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.number().int().min(1990).max(2100).optional(),
  ),
  placement: z.string().trim().max(80).optional().or(z.literal("")),
  sortBy: z.enum(["year", "tournament", "placement"]).default("year"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type PlayerTournamentsListQuery = z.infer<typeof playerTournamentsListQuerySchema>;
