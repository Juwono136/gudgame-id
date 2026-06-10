import Image from "next/image";
import Link from "next/link";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { publicSportRoutes } from "@/lib/constants/routes";
import { getPublicWikiPath, WIKI_ENTITY_TYPE_PLURAL } from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/lib/domain/wiki";

type EntityListItem = {
  slug: string;
  displayName: string;
  nickname: string | null;
  summary: string | null;
  primaryImageUrl: string | null;
};

type EntityListPageProps = {
  sportSlug: string;
  sportName: string;
  entityType: WikiEntityType;
  items: EntityListItem[];
};

export function EntityListPage({
  sportSlug,
  sportName,
  entityType,
  items,
}: EntityListPageProps) {
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
        {items.map((item) => (
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
              <h2 className="font-semibold text-foreground group-hover:text-cp-logo-accent">
                {item.displayName}
              </h2>
              {item.summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-cp-muted">{item.summary}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-cp-muted">
          No published entries yet. Check back soon.
        </p>
      ) : null}
    </WikiPageShell>
  );
}
