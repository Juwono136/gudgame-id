"use client";

import { Pencil, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PerformanceBars } from "@/components/wiki/performance-bars";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { SpecGrid } from "@/components/wiki/spec-grid";
import { WikiImage } from "@/components/wiki/wiki-image";
import { formatIdrDisplay, parseIdrInput } from "@/lib/format/currency";
import {
  GEAR_CATEGORY_LABELS,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import type { GearProductValues } from "@/lib/wiki/gear-form";
import {
  getFilledGearPerformance,
  getFilledGearSpecs,
  hasAnyGearTechnicalData,
} from "@/lib/wiki/gear/spec-display";
import { partitionFieldValues } from "@/lib/wiki/field-definitions";
import { getGearSpecsFields } from "@/lib/wiki/gear/spec-fields";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type GearWizardReviewProps = {
  sportSlug: string;
  product: GearProductValues;
  fieldValues: Record<string, unknown>;
  status: string;
  sourceType: string;
  primaryPreview: string;
  onEditProduct?: () => void;
  onEditSpecs?: () => void;
};

export function GearWizardReview({
  sportSlug,
  product,
  fieldValues,
  status,
  sourceType,
  primaryPreview,
  onEditProduct,
  onEditSpecs,
}: GearWizardReviewProps) {
  const category = normalizeGearCategory(product.gearCategory || "other");
  const categoryLabel = GEAR_CATEGORY_LABELS[category as GearCategory] ?? category;
  const priceN = parseIdrInput(product.priceIdr);
  const priceDisplay = priceN != null && priceN > 0 ? formatIdrDisplay(priceN) : null;

  const gearFields = getGearSpecsFields(sportSlug, category);
  const partitioned = partitionFieldValues(gearFields, fieldValues);
  const specItems = getFilledGearSpecs(partitioned.specs);
  const perfMetrics = getFilledGearPerformance(partitioned.performance);
  const hasTechnical = hasAnyGearTechnicalData(partitioned.specs, partitioned.performance);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Review gear entry</h2>
          <p className="mt-1 text-sm text-cp-muted">
            Preview matches the public product page layout.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onEditProduct ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-cp-border"
              onClick={onEditProduct}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit product
            </Button>
          ) : null}
          {onEditSpecs ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-cp-border"
              onClick={onEditSpecs}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit details
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,220px)_1fr] lg:grid-cols-[minmax(200px,260px)_1fr]">
          <div className="relative aspect-square border-b border-cp-border bg-cp-elevated md:border-b-0 md:border-r">
            {primaryPreview ? (
              <WikiImage
                src={primaryPreview}
                alt={product.displayName || "Product"}
                fill
                className="object-cover"
                sizes="260px"
              />
            ) : (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-sm text-cp-muted">
                <Package className="h-7 w-7 opacity-40" />
                No image
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center p-4 sm:p-5 lg:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-cp-border bg-cp-elevated">{categoryLabel}</Badge>
              {priceDisplay ? (
                <Badge className={statusBadgeClass.price}>{priceDisplay}</Badge>
              ) : null}
              <Badge
                className={cn(
                  status === "published" ? statusBadgeClass.success : statusBadgeClass.muted,
                )}
              >
                {status === "published" ? "Published" : "Draft"}
              </Badge>
              {sourceType === "scraped" ? (
                <Badge className={statusBadgeClass.accent}>
                  Scraped
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">
              {product.displayName || "—"}
            </h3>
            {product.brand ? (
              <p className="mt-1 text-sm text-cp-muted">{product.brand}</p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:max-w-xs">
              <div>
                <dt className="font-medium uppercase tracking-wider text-cp-muted">Status</dt>
                <dd className="mt-0.5 capitalize text-foreground">{status}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wider text-cp-muted">Source</dt>
                <dd className="mt-0.5 capitalize text-foreground">{sourceType}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-5 lg:col-span-2">
          {product.summary ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">Description</h3>
              <div className="mt-3">
                <RichHtmlContent html={product.summary} />
              </div>
            </section>
          ) : null}

          {perfMetrics.length > 0 ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">Performance feel</h3>
              <div className="mt-4">
                <PerformanceBars metrics={perfMetrics} />
              </div>
            </section>
          ) : null}

          {!hasTechnical ? (
            <p className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/20 px-4 py-3 text-xs text-cp-muted">
              No technical details — optional specs stay hidden on the public page.{" "}
              {onEditSpecs ? (
                <button
                  type="button"
                  className="font-medium text-cp-primary hover:underline"
                  onClick={onEditSpecs}
                >
                  Add details
                </button>
              ) : null}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          {specItems.length > 0 ? (
            <SpecGrid title="Technical details" items={specItems} />
          ) : null}
        </aside>
      </div>
    </section>
  );
}
