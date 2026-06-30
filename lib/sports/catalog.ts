/** Canonical sport disciplines — shared by player settings and admin sport provisioning. */
export const SPORT_CATALOG = [
  { slug: "padel", name: "Padel" },
  { slug: "tennis", name: "Tennis" },
  { slug: "pickleball", name: "Pickleball" },
  { slug: "badminton", name: "Badminton" },
  { slug: "squash", name: "Squash" },
  { slug: "table-tennis", name: "Table tennis" },
  { slug: "basketball", name: "Basketball" },
  { slug: "football", name: "Football (soccer)" },
  { slug: "futsal", name: "Futsal" },
  { slug: "volleyball", name: "Volleyball" },
  { slug: "beach-volleyball", name: "Beach volleyball" },
  { slug: "golf", name: "Golf" },
  { slug: "running", name: "Running" },
  { slug: "cycling", name: "Cycling" },
  { slug: "swimming", name: "Swimming" },
  { slug: "martial-arts", name: "Martial arts" },
  { slug: "boxing", name: "Boxing" },
  { slug: "mma", name: "MMA" },
  { slug: "cricket", name: "Cricket" },
  { slug: "baseball", name: "Baseball" },
  { slug: "softball", name: "Softball" },
  { slug: "hockey", name: "Hockey" },
  { slug: "rugby", name: "Rugby" },
  { slug: "esports", name: "Esports" },
  { slug: "billiard", name: "Billiard" },
] as const;

export type SportCatalogSlug = (typeof SPORT_CATALOG)[number]["slug"];

const catalogBySlug = new Map(
  SPORT_CATALOG.map((entry) => [entry.slug, entry] as const),
);

export function isSportCatalogSlug(slug: string): slug is SportCatalogSlug {
  return catalogBySlug.has(slug as SportCatalogSlug);
}

export function getSportCatalogEntry(slug: string) {
  return catalogBySlug.get(slug as SportCatalogSlug) ?? null;
}

export function getSportCatalogName(slug: string): string | null {
  return getSportCatalogEntry(slug)?.name ?? null;
}

/** Keep only valid, unique catalog slugs (order preserved). */
export function filterSportCatalogSlugs(slugs: string[]): SportCatalogSlug[] {
  const seen = new Set<SportCatalogSlug>();
  const result: SportCatalogSlug[] = [];
  for (const raw of slugs) {
    const slug = raw.trim();
    if (!isSportCatalogSlug(slug) || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
  }
  return result;
}

export function assertSportCatalogIdentity(name: string, slug: string): void {
  const entry = getSportCatalogEntry(slug);
  if (!entry) {
    throw new Error(`Unknown sport catalog slug: ${slug}`);
  }
  if (entry.name !== name.trim()) {
    throw new Error(`Sport name must match catalog entry for slug "${slug}"`);
  }
}
