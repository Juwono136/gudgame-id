import { z } from "zod";
import {
  WIKI_ENTITY_STATUSES,
  WIKI_ENTITY_TYPES,
  WIKI_SOURCE_TYPES,
} from "@/db/schema/wiki";

export const wikiEntityTypeSchema = z.enum(WIKI_ENTITY_TYPES);

/** Admin wiki database filter — includes tournaments (separate table). */
export const wikiDirectoryTypeFilterSchema = z.enum([
  ...WIKI_ENTITY_TYPES,
  "tournament",
] as const);
export const wikiEntityStatusSchema = z.enum(WIKI_ENTITY_STATUSES);

export const wikiRelationInputSchema = z.object({
  toEntityId: z.coerce.number().int().positive(),
  relationType: z.string().trim().min(1).max(40),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const storedImageUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      v.startsWith("/api/media/") ||
      v.startsWith("http://") ||
      v.startsWith("https://"),
    "Invalid image URL",
  );

export const wikiMediaInputSchema = z.object({
  url: storedImageUrl.optional(),
  storageKey: z.string().max(512).optional(),
  caption: z.string().max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const wikiFeatureSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  icon: z.string().trim().max(40).optional(),
});

export const wikiEntityUpsertSchema = z.object({
  entityType: wikiEntityTypeSchema,
  displayName: z.string().trim().min(2).max(200),
  nickname: z.string().trim().max(120).optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
    .optional(),
  summary: z.string().trim().max(12000).optional().or(z.literal("")),
  biography: z.string().trim().max(50000).optional().or(z.literal("")),
  status: wikiEntityStatusSchema.default("draft"),
  attributes: z.record(z.string(), z.unknown()).default({}),
  performance: z.record(z.string(), z.unknown()).default({}),
  specs: z.record(z.string(), z.unknown()).default({}),
  features: z.array(wikiFeatureSchema).default([]),
  sourceType: z.enum(WIKI_SOURCE_TYPES).default("manual"),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  relations: z.array(wikiRelationInputSchema).default([]),
  gallery: z.array(wikiMediaInputSchema).default([]),
  heroImageUrl: storedImageUrl.optional().or(z.literal("")),
  primaryImageUrl: storedImageUrl.optional().or(z.literal("")),
});

export type WikiEntityUpsertInput = z.infer<typeof wikiEntityUpsertSchema>;

export const wikiEntitiesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().max(100).optional(),
  entityType: wikiDirectoryTypeFilterSchema.optional(),
  status: wikiEntityStatusSchema.or(z.literal("all")).default("all"),
  sortBy: z.enum(["name", "updated", "created"]).default("updated"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type WikiEntitiesListQuery = z.infer<typeof wikiEntitiesListQuerySchema>;

export const wikiScrapeRequestSchema = z.object({
  url: z.string().url().max(2000),
  sportSlug: z.string().trim().min(1).max(50),
});
