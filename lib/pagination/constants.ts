export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function clampPaginationParams(
  limit: number | undefined,
  offset: number | undefined,
  maxLimit = 100,
): { limit: number; offset: number } {
  const safeLimit = Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), maxLimit);
  const safeOffset = Math.max(offset ?? 0, 0);
  return { limit: safeLimit, offset: safeOffset };
}

export function toOffset(page: number, pageSize: number): number {
  return Math.max(page - 1, 0) * pageSize;
}

export function toTotalPages(total: number, pageSize: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function paginationRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}
