import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { createWikiEntity } from "@/lib/wiki/service";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { assertScrapeUrlAllowed } from "@/lib/wiki/scrapers/security";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const previewSchema = z.object({
  sourceUrl: z.string().url(),
  displayName: z.string().min(1),
  summary: z.string().optional(),
  primaryImageUrl: z.string().url().optional().or(z.literal("")),
  attributes: z.record(z.string(), z.unknown()).default({}),
  performance: z.record(z.string(), z.unknown()).default({}),
  specs: z.record(z.string(), z.unknown()).default({}),
});

const bodySchema = z.object({
  items: z.array(previewSchema).min(1).max(30),
  publish: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireWikiManagementAccess();
    const body = bodySchema.parse(await request.json());

    const created: { id: string; displayName: string; slug: string }[] = [];
    const failed: { displayName: string; error: string }[] = [];

    for (const item of body.items) {
      try {
        await assertScrapeUrlAllowed(item.sourceUrl, { sportId: ctx.sportId });

        const preview: WikiScrapePreview = {
          sourceUrl: item.sourceUrl,
          sourceHost: new URL(item.sourceUrl).hostname,
          displayName: item.displayName,
          summary: item.summary,
          primaryImageUrl: item.primaryImageUrl || undefined,
          attributes: item.attributes,
          performance: item.performance,
          specs: item.specs,
          features: [],
        };

        const entity = await createWikiEntity(
          ctx.sportId,
          {
            entityType: "gear",
            displayName: preview.displayName,
            slug: slugifyWikiName(preview.displayName),
            summary: preview.summary,
            status: body.publish ? "published" : "draft",
            attributes: preview.attributes,
            performance: preview.performance,
            specs: preview.specs,
            features: [],
            sourceType: "scraped",
            sourceUrl: preview.sourceUrl,
            relations: [],
            gallery: [],
            primaryImageUrl: preview.primaryImageUrl,
          },
          ctx.userId,
          preview.primaryImageUrl
            ? { primaryUrl: preview.primaryImageUrl }
            : undefined,
        );
        created.push({
          id: entity.id,
          displayName: entity.displayName,
          slug: entity.slug,
        });
      } catch (err) {
        failed.push({
          displayName: item.displayName,
          error: err instanceof Error ? err.message : "Create failed",
        });
      }
    }

    return jsonSuccess({ created, failed });
  } catch (error) {
    return jsonError(error);
  }
}
