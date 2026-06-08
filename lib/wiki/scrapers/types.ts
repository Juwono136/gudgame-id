export type WikiScrapePreview = {
  sourceUrl: string;
  sourceHost: string;
  displayName: string;
  summary?: string;
  primaryImageUrl?: string;
  heroImageUrl?: string;
  attributes: Record<string, unknown>;
  performance: Record<string, unknown>;
  specs: Record<string, unknown>;
  features: { title: string; description: string; icon?: string }[];
};

export type WikiCatalogListItem = {
  url: string;
  title: string;
  imageUrl?: string;
  priceHint?: string;
};

export type WikiCatalogDiscovery = {
  sourceUrl: string;
  sourceHost: string;
  pageType: "product" | "catalog";
  items: WikiCatalogListItem[];
  truncated: boolean;
  totalFound: number;
};

export type WikiBatchScrapeResult = {
  succeeded: WikiScrapePreview[];
  failed: { url: string; error: string }[];
};
