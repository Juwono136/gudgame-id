/**
 * Soften aggressive client polling in local development so many open tournament /
 * manage tabs do not keep the laptop CPU pegged while `next dev` is compiling.
 *
 * Production intervals stay unchanged. Set NEXT_PUBLIC_DEV_FAST_POLL=1 to keep
 * production-like polling while debugging live scoring locally.
 */
export function softDevPollMs(productionMs: number): number {
  if (process.env.NODE_ENV !== "development") return productionMs;
  if (process.env.NEXT_PUBLIC_DEV_FAST_POLL === "1") return productionMs;
  // Stretch short polls (2–8s) without making completed/idle states feel frozen.
  if (productionMs <= 8_000) return Math.min(productionMs * 2, 12_000);
  if (productionMs <= 15_000) return Math.min(productionMs * 1.5, 20_000);
  return productionMs;
}
