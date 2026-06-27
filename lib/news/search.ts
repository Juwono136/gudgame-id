import "server-only";

export type NewsSearchItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
};

/**
 * Search published news articles. Returns an empty list until the news CMS ships.
 * Wire this to the news/articles table when the feature is implemented.
 */
export async function searchPublishedNews(
  query: string,
  limit = 8,
): Promise<NewsSearchItem[]> {
  void query;
  void limit;
  return [];
}
