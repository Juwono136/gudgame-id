import { z } from "zod";

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(100, "Query is too long"),
  sportSlug: z.string().trim().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
