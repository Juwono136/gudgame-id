import Image from "next/image";
import Link from "next/link";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { Badge } from "@/components/ui/badge";
import { publicSportRoutes } from "@/lib/constants/routes";
import { formatIdrDisplay } from "@/lib/format/currency";
import { htmlExcerpt } from "@/lib/html/strip-html";
import { getPublicWikiPath, WIKI_ENTITY_TYPE_PLURAL } from "@/lib/wiki/constants";
import {
  GEAR_CATEGORY_LABELS,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";
import type { WikiEntityType } from "@/lib/domain/wiki";

type EntityListItem = {
  slug: string;
  displayName: string;
  nickname: string | null;
  summary: string | null;
  primaryImageUrl: string | null;
  attributes?: Record<string, unknown> | null;
};

type EntityListPageProps = {
  sportSlug: string;
  sportName: string;
  entityType: WikiEntityType;
  items: EntityListItem[];
};

function gearCardMeta(attributes?: Record<string, unknown> | null) {
  if (!attributes) return { categoryLabel: null, priceDisplay: null };
  const category = normalizeGearCategory(String(attributes.gearCategory ?? ""));
  const categoryLabel = GEAR_CATEGORY_LABELS[category as GearCategory] ?? category;
  const priceDisplay =
    (typeof attributes.priceDisplay === "string" && attributes.priceDisplay) ||
    (typeof attributes.price === "string" && attributes.price) ||
    (typeof attributes.priceIdr === "number" && attributes.priceIdr > 0
      ? formatIdrDisplay(attributes.priceIdr)
      : null);
  return { categoryLabel, priceDisplay };
}

export function EntityListPage({
  sportSlug,
  sportName,
  entityType,
  items,
}: EntityListPageProps) {
  const isGear = entityType === "gear";

  return (
    <WikiPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: sportName, href: publicSportRoutes.sportHub(sportSlug) },
        { label: WIKI_ENTITY_TYPE_PLURAL[entityType] },
      ]}
    >
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {WIKI_ENTITY_TYPE_PLURAL[entityType]}
        </h1>
        <p className="mt-2 text-cp-muted">
          Explore the {sportName} wiki — performance data and profiles.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const excerpt = item.summary ? htmlExcerpt(item.summary, 120) : null;
          const meta = isGear ? gearCardMeta(item.attributes) : null;

          return (
            <Link
              key={item.slug}
              href={getPublicWikiPath(sportSlug, entityType, item.slug)}
              className="group overflow-hidden rounded-xl border border-cp-border bg-cp-card transition-all hover:border-cp-primary/50 hover:shadow-[0_0_24px_var(--cp-primary-glow)]"
            >
              <div className="relative aspect-[4/3] bg-cp-elevated">
                {item.primaryImageUrl ? (
                  <Image
                    src={item.primaryImageUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-foreground group-hover:text-cp-logo-accent">
                    {item.displayName}
                  </h2>
                  {meta?.categoryLabel ? (
                    <Badge className="border-cp-border bg-cp-elevated text-[10px]">
                      {meta.categoryLabel}
                    </Badge>
                  ) : null}
                </div>
                {meta?.priceDisplay ? (
                  <p className="mt-1 text-sm font-medium text-emerald-400">{meta.priceDisplay}</p>
                ) : null}
                {excerpt ? (
                  <p className="mt-1 line-clamp-2 text-xs text-cp-muted">{excerpt}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-cp-muted">
          No published entries yet. Check back soon.
        </p>
      ) : null}
    </WikiPageShell>
  );
}
