import { z } from "zod";
import { DEFAULT_PAGE_SIZE, toTotalPages } from "@/lib/pagination/constants";

export const partnerTournamentStatusFilterSchema = z.enum([
  "all",
  "active",
  "live",
  "upcoming",
  "completed",
  "cancelled",
  "draft",
]);

export const partnerLeagueStatusFilterSchema = z.enum([
  "all",
  "public",
  "draft",
  "active",
  "completed",
  "archived",
]);

export const partnerSortDirSchema = z.enum(["asc", "desc"]);

export const partnerTournamentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
  status: partnerTournamentStatusFilterSchema.default("all"),
  sortBy: z.enum(["name", "startsAt", "updatedAt"]).default("updatedAt"),
  sortDir: partnerSortDirSchema.default("desc"),
});

export const partnerLeaguesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
  status: partnerLeagueStatusFilterSchema.default("all"),
  sortBy: z.enum(["name", "updatedAt", "createdAt"]).default("updatedAt"),
  sortDir: partnerSortDirSchema.default("desc"),
});

export const partnerEligibilityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(DEFAULT_PAGE_SIZE),
  q: z.string().trim().max(100).optional(),
  sortBy: z.enum(["playedAt", "playerName", "tournamentName"]).default("playedAt"),
  sortDir: partnerSortDirSchema.default("desc"),
});

export type PartnerTournamentsListQuery = z.infer<typeof partnerTournamentsListQuerySchema>;
export type PartnerLeaguesListQuery = z.infer<typeof partnerLeaguesListQuerySchema>;
export type PartnerEligibilityListQuery = z.infer<typeof partnerEligibilityListQuerySchema>;

export type PartnerPagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function toPartnerPagedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PartnerPagedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: toTotalPages(total, pageSize),
  };
}

export function parseSearchParamsWithSchema<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T,
): z.infer<T> {
  const raw = Object.fromEntries(searchParams.entries());
  return schema.parse(raw);
}
