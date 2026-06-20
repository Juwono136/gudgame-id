import type { WikiEntityDetail } from "@/lib/wiki/service";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { PerformanceBars } from "@/components/wiki/performance-bars";
import { SpecGrid } from "@/components/wiki/spec-grid";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { WikiImage } from "@/components/wiki/wiki-image";
import { Badge } from "@/components/ui/badge";
import { publicSportRoutes } from "@/lib/constants/routes";
import { WIKI_ENTITY_TYPE_PLURAL } from "@/lib/wiki/constants";
import { resolveWikiImageUrl } from "@/lib/media/client";
import { formatIdrDisplay } from "@/lib/format/currency";
import {
  GEAR_CATEGORY_LABELS,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import {
  gearProductAtAGlance,
  getFilledGearPerformance,
  getFilledGearSpecs,
  hasAnyGearTechnicalData,
} from "@/lib/wiki/gear/spec-display";

type GearDetailLayoutProps = {
  entity: WikiEntityDetail;
  sportName: string;
};

export function GearDetailLayout({ entity, sportName }: GearDetailLayoutProps) {
  const category = normalizeGearCategory(String(entity.attributes.gearCategory ?? "other"));
  const categoryLabel = GEAR_CATEGORY_LABELS[category as GearCategory] ?? category;

  const priceDisplay =
    (typeof entity.attributes.priceDisplay === "string" && entity.attributes.priceDisplay) ||
    (typeof entity.attributes.price === "string" && entity.attributes.price) ||
    (typeof entity.attributes.priceIdr === "number" && entity.attributes.priceIdr > 0
      ? formatIdrDisplay(entity.attributes.priceIdr)
      : null);

  const brand =
    typeof entity.attributes.brand === "string" && entity.attributes.brand.trim()
      ? entity.attributes.brand.trim()
      : null;

  const primaryImage = resolveWikiImageUrl(
    entity.primaryImageUrl,
    entity.primaryImageStorageKey,
  );

  const specItems = getFilledGearSpecs(entity.specs);
  const perfMetrics = getFilledGearPerformance(entity.performance);
  const hasTechnical = hasAnyGearTechnicalData(entity.specs, entity.performance);

  const atAGlance = gearProductAtAGlance(
    entity.attributes,
    category,
    categoryLabel,
    priceDisplay,
  );

  const descriptionHtml = entity.biography || entity.summary;

  return (
    <WikiPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: sportName, href: publicSportRoutes.sportHub(entity.sportSlug) },
        {
          label: WIKI_ENTITY_TYPE_PLURAL.gear,
          href: publicSportRoutes.gear(entity.sportSlug),
        },
        { label: entity.displayName },
      ]}
    >
      <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr] lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="relative aspect-square border-b border-cp-border bg-cp-elevated md:border-b-0 md:border-r">
            {primaryImage ? (
              <WikiImage
                src={primaryImage}
                alt={entity.displayName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 360px"
                priority
              />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-cp-muted">
                No image
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-cp-border bg-cp-elevated">{categoryLabel}</Badge>
              {priceDisplay ? (
                <Badge className={statusBadgeClass.price}>{priceDisplay}</Badge>
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {entity.displayName}
            </h1>
            {brand ? (
              <p className="mt-1.5 text-sm font-medium text-cp-muted sm:text-base">{brand}</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          {descriptionHtml ? (
            <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6 cp-shadow-card">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Description</h2>
              <div className="mt-4">
                <RichHtmlContent html={descriptionHtml} variant="article" />
              </div>
            </section>
          ) : null}

          {perfMetrics.length > 0 ? (
            <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6 cp-shadow-card">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Performance feel</h2>
              <p className="mt-1 text-xs text-cp-muted sm:text-sm">
                How this gear performs on court — rated by the community wiki.
              </p>
              <div className="mt-4">
                <PerformanceBars metrics={perfMetrics} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:space-y-6">
          {atAGlance.length > 0 ? (
            <SpecGrid title="At a glance" items={atAGlance} />
          ) : null}

          {specItems.length > 0 ? (
            <SpecGrid title="Technical details" items={specItems} />
          ) : null}

          {!hasTechnical ? (
            <p className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/20 px-4 py-3 text-xs leading-relaxed text-cp-muted">
              No optional technical specs published for this product yet.
            </p>
          ) : null}
        </aside>
      </div>
    </WikiPageShell>
  );
}
