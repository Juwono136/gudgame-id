import Image from "next/image";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { WikiEntityRelationView } from "@/lib/wiki/service";
import { getPublicWikiPath } from "@/lib/wiki/constants";
import type { WikiEntityType } from "@/db/schema/wiki";

type RelatedEntitiesProps = {
  title: string;
  relations: WikiEntityRelationView[];
  sportSlug: string;
};

export function RelatedEntities({ title, relations, sportSlug }: RelatedEntitiesProps) {
  return (
    <section className="rounded-xl border border-cp-border bg-cp-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {relations.map((rel) => (
          <li key={rel.id}>
            <Link
              href={getPublicWikiPath(
                sportSlug,
                rel.entity.entityType as WikiEntityType,
                rel.entity.slug,
              )}
              className="flex items-center gap-3 rounded-lg border border-cp-border bg-cp-elevated/50 p-3 transition-colors hover:border-cp-primary/40"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-cp-elevated">
                {resolveWikiImageUrl(rel.entity.primaryImageUrl) ? (
                  <Image
                    src={resolveWikiImageUrl(rel.entity.primaryImageUrl)!}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{rel.entity.displayName}</p>
                {(rel.metadata.role as string) ? (
                  <p className="text-xs uppercase tracking-wide text-cp-primary">
                    {String(rel.metadata.role)}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-cp-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
