import type { WikiEntityDetail } from "@/lib/wiki/service";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { EntityHero } from "@/components/wiki/entity-hero";
import { PerformanceBars } from "@/components/wiki/performance-bars";
import { SpecGrid } from "@/components/wiki/spec-grid";
import { RelatedEntities } from "@/components/wiki/related-entities";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { publicSportRoutes } from "@/lib/constants/routes";
import { WIKI_ENTITY_TYPE_PLURAL } from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/db/schema/wiki";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
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
    .filter(([, v]) => typeof v === "number" || (typeof v === "string" && v !== ""))
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

  for (const [k, v] of Object.entries(entity.specs)) {
    add(k.replace(/([A-Z])/g, " $1").trim(), v);
  }
  for (const [k, v] of Object.entries(entity.attributes)) {
    if (["brand", "model", "gearCategory", "nationality", "tier"].includes(k)) {
      add(k.replace(/([A-Z])/g, " $1").trim(), v);
    }
  }
  return items;
}

export function EntityDetailLayout({ entity, sportName }: EntityDetailLayoutProps) {
  const typeLabel = entity.entityType as WikiEntityType;

  const perfMetrics = performanceFromRecord(entity.performance);
  const specItems = specsFromEntity(entity);

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

  const galleryUrls = entity.gallery
    .map((m) => resolveWikiImageUrl(m.url))
    .filter((u): u is string => Boolean(u));

  const primaryImage = resolveWikiImageUrl(entity.primaryImageUrl);
  const heroImage = resolveWikiImageUrl(entity.heroImageUrl);

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
        summary={entity.summary}
        imageUrl={primaryImage}
        heroUrl={heroImage}
        badges={badges}
      />

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {perfMetrics.length > 0 ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Performance profile</h2>
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

          {galleryUrls.length > 0 &&
          (entity.entityType === "player" || entity.entityType === "team") ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Photos</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {galleryUrls.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative aspect-square overflow-hidden rounded-lg bg-cp-elevated"
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="(max-width:768px) 50vw, 33vw" />
                  </div>
                ))}
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
          {specItems.length > 0 ? (
            <SpecGrid title="Technical specs" items={specItems} />
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
