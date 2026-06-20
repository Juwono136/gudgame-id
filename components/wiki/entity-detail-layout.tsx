import type { WikiEntityDetail } from "@/lib/wiki/service";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { EntityHero } from "@/components/wiki/entity-hero";
import { PerformanceBars } from "@/components/wiki/performance-bars";
import { SpecGrid } from "@/components/wiki/spec-grid";
import { RelatedEntities } from "@/components/wiki/related-entities";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { publicSportRoutes } from "@/lib/constants/routes";
import { WIKI_ENTITY_TYPE_PLURAL } from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/lib/domain/wiki";
import { resolveWikiImageUrl } from "@/lib/media/client";
import { formatIdrDisplay } from "@/lib/format/currency";
import { htmlExcerpt } from "@/lib/html/strip-html";
import { GEAR_CATEGORY_LABELS, type GearCategory } from "@/lib/wiki/gear/constants";
import { normalizeGearCategory } from "@/lib/wiki/gear/validation";
import {
  gearProductAtAGlance,
  getFilledGearPerformance,
  getFilledGearSpecs,
} from "@/lib/wiki/gear/spec-display";
import { equipmentFromAttributes } from "@/lib/wiki/player-equipment";
import {
  getPlayerCareerStats,
  getSignatureGearItem,
} from "@/lib/wiki/player-career-stats";
import {
  parsePlayerEditableAttributes,
  parseSocialLinks,
} from "@/lib/wiki/player-profile-fields";
import Link from "next/link";
import Image from "next/image";

type EntityDetailLayoutProps = {
  entity: WikiEntityDetail;
  sportName: string;
};

function performanceFromRecord(
  perf: Record<string, unknown>,
): { label: string; value: number; max?: number }[] {
  const labels: Record<string, string> = {
    power: "Power",
    control: "Control",
    agility: "Agility",
    maneuverability: "Maneuverability",
    winRate: "Win rate",
    worldRank: "World rank",
    totalPoints: "Points",
    careerTitles: "Career titles",
    seasonPoints: "Season points",
    titles: "Titles",
    winStreak: "Win streak",
  };

  return Object.entries(perf)
    .filter(([, v]) => {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n > 0;
    })
    .map(([key, v]) => ({
      label: labels[key] ?? key,
      value: typeof v === "number" ? v : Number(v) || 0,
      max: key === "worldRank" ? undefined : 100,
    }))
    .slice(0, 6);
}

function specsFromEntity(entity: WikiEntityDetail): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const add = (label: string, val: unknown) => {
    if (val != null && String(val).trim()) items.push({ label, value: String(val) });
  };

  if (entity.entityType === "gear") {
    return getFilledGearSpecs(entity.specs);
  }

  for (const [k, v] of Object.entries(entity.specs)) {
    add(k.replace(/([A-Z])/g, " $1").trim(), v);
  }
  for (const [k, v] of Object.entries(entity.attributes)) {
    if (["brand", "model", "gearCategory", "nationality", "tier", "price", "priceDisplay", "priceIdr"].includes(k)) {
      continue;
    }
    add(k.replace(/([A-Z])/g, " $1").trim(), v);
  }
  return items;
}

export function EntityDetailLayout({ entity, sportName }: EntityDetailLayoutProps) {
  const typeLabel = entity.entityType as WikiEntityType;
  const isGear = entity.entityType === "gear";

  const perfMetrics = isGear
    ? getFilledGearPerformance(entity.performance)
    : performanceFromRecord(entity.performance);
  const specItems = specsFromEntity(entity);

  const gearCategory = isGear
    ? normalizeGearCategory(String(entity.attributes.gearCategory ?? "other"))
    : null;
  const gearAtAGlance = isGear
    ? gearProductAtAGlance(
        entity.attributes,
        gearCategory!,
        GEAR_CATEGORY_LABELS[gearCategory as GearCategory] ?? gearCategory!,
        (typeof entity.attributes.priceDisplay === "string" && entity.attributes.priceDisplay) ||
          (typeof entity.attributes.price === "string" && entity.attributes.price) ||
          (typeof entity.attributes.priceIdr === "number" && entity.attributes.priceIdr > 0
            ? formatIdrDisplay(entity.attributes.priceIdr)
            : null),
      )
    : [];

  const tier = entity.attributes.tier as string | undefined;
  const badges = [
    tier ? { label: `${String(tier).toUpperCase()} TIER`, variant: "green" as const } : null,
    entity.attributes.nationality
      ? { label: String(entity.attributes.nationality), variant: "blue" as const }
      : null,
    entity.attributes.gearCategory
      ? { label: String(entity.attributes.gearCategory), variant: "default" as const }
      : null,
  ].filter(Boolean) as { label: string; variant?: "green" | "blue" | "default" }[];

  const isPlayer = entity.entityType === "player";
  const playerEditable = isPlayer
    ? parsePlayerEditableAttributes(entity.attributes)
    : null;
  const playerCareer = isPlayer ? getPlayerCareerStats(entity) : null;
  const playerEquipment = isPlayer ? equipmentFromAttributes(entity.attributes) : [];
  const signatureGear = isPlayer ? getSignatureGearItem(entity.attributes) : null;
  const socialLinks = isPlayer ? parseSocialLinks(entity.attributes.socialLinks) : [];

  const galleryUrls = entity.gallery
    .map((m) => resolveWikiImageUrl(m.url))
    .filter((u): u is string => Boolean(u));

  const primaryImage = resolveWikiImageUrl(
    entity.primaryImageUrl,
    entity.primaryImageStorageKey,
  );
  const heroImage = resolveWikiImageUrl(entity.heroImageUrl, entity.heroImageStorageKey);

  const isGearEntity = entity.entityType === "gear";
  const heroSummary =
    isGearEntity && entity.summary ? htmlExcerpt(entity.summary, 200) : entity.summary;

  return (
    <WikiPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: sportName, href: publicSportRoutes.sportHub(entity.sportSlug) },
        {
          label: WIKI_ENTITY_TYPE_PLURAL[typeLabel],
          href:
            typeLabel === "player"
              ? publicSportRoutes.players(entity.sportSlug)
              : typeLabel === "team"
                ? publicSportRoutes.teams(entity.sportSlug)
                : publicSportRoutes.gear(entity.sportSlug),
        },
        { label: entity.displayName },
      ]}
    >
      <EntityHero
        displayName={entity.displayName}
        nickname={entity.nickname}
        summary={heroSummary}
        imageUrl={primaryImage}
        heroUrl={heroImage}
        badges={badges}
      />

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {perfMetrics.length > 0 ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                {isGear ? "Performance feel" : "Performance profile"}
              </h2>
              <div className="mt-4">
                <PerformanceBars metrics={perfMetrics} />
              </div>
            </section>
          ) : null}

          {entity.biography ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                {entity.entityType === "gear" ? "Description" : "Biography"}
              </h2>
              <div className="mt-4">
                <RichHtmlContent html={entity.biography} />
              </div>
            </section>
          ) : null}

          {!entity.biography && entity.summary && entity.entityType === "gear" ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Description</h2>
              <div className="mt-4">
                <RichHtmlContent html={entity.summary} />
              </div>
            </section>
          ) : null}

          {entity.features.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-3">
              {entity.features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-cp-border bg-cp-card p-4"
                >
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-cp-muted">
                    {f.description}
                  </p>
                </div>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          {isPlayer && (playerEditable?.nationality || playerEditable?.age || playerCareer?.yearsActive) ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Biodata</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {playerEditable?.nationality ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-cp-muted">Nationality</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{playerEditable.nationality}</dd>
                  </div>
                ) : null}
                {playerEditable?.age != null ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-cp-muted">Age</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{playerEditable.age}</dd>
                  </div>
                ) : null}
                {playerCareer?.yearsActive ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-cp-muted">Years active</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{playerCareer.yearsActive}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {signatureGear ? (
            <section className="rounded-xl border border-cp-primary/30 bg-cp-primary/5 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Signature gear</h2>
              <div className="mt-3 flex gap-3">
                {signatureGear.imageUrl ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-cp-border">
                    <Image
                      src={resolveWikiImageUrl(signatureGear.imageUrl) ?? signatureGear.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : null}
                <div>
                  <p className="font-semibold text-foreground">{signatureGear.name}</p>
                  {signatureGear.brand ? (
                    <p className="text-xs text-cp-muted">{signatureGear.brand}</p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {socialLinks.length > 0 ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Social</h2>
              <ul className="mt-3 space-y-2">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-cp-primary hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {playerEquipment.length > 0 ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Equipment</h2>
              <ul className="mt-4 space-y-3">
                {playerEquipment.map((item) => {
                  const imageUrl = resolveWikiImageUrl(item.imageUrl);
                  return (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-lg border border-cp-border bg-cp-elevated/40 p-3"
                    >
                      {imageUrl ? (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cp-elevated">
                          <Image
                            src={imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        {item.gearEntityId && item.gearPublicUrl ? (
                          <Link
                            href={item.gearPublicUrl}
                            className="text-sm font-semibold text-cp-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        )}
                        <p className="text-xs capitalize text-cp-muted">{item.category}</p>
                        {item.brand ? (
                          <p className="mt-0.5 text-xs text-cp-muted">{item.brand}</p>
                        ) : null}
                        {item.notes ? (
                          <p className="mt-1 text-xs leading-relaxed text-cp-text-dim">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {galleryUrls.length > 0 &&
          (entity.entityType === "player" || entity.entityType === "team") ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Gallery</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {galleryUrls.slice(0, 4).map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative aspect-square overflow-hidden rounded-lg bg-cp-elevated"
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {isGear && gearAtAGlance.length > 0 ? (
            <SpecGrid title="At a glance" items={gearAtAGlance} />
          ) : null}

          {specItems.length > 0 ? (
            <SpecGrid
              title={entity.entityType === "gear" ? "Technical details" : "Biodata"}
              items={specItems}
            />
          ) : null}

          {entity.relations.length > 0 ? (
            <RelatedEntities
              title={
                entity.entityType === "team"
                  ? "Roster"
                  : entity.entityType === "gear"
                    ? "Professional users"
                    : "Linked entities"
              }
              relations={entity.relations}
              sportSlug={entity.sportSlug}
            />
          ) : null}

          {galleryUrls.length > 0 && entity.entityType === "gear" ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-4">
              <h2 className="text-sm font-semibold text-foreground">Gallery</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {galleryUrls.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative aspect-square overflow-hidden rounded-lg bg-cp-elevated"
                  >
                    <Image src={url} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </WikiPageShell>
  );
}
