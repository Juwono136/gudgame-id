import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** Paths that commonly bloat on Windows and drag down `next dev`. */
export const DEV_CACHE_PATHS = [
  join(ROOT, ".next", "dev", "cache", "turbopack"),
  join(ROOT, ".next", "cache", "webpack"),
  join(ROOT, "node_modules", ".cache"),
];

export function dirSizeBytes(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      try {
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile()) {
          total += statSync(full).size;
        }
      } catch {
        // Ignore races / locked files on Windows.
      }
    }
  }
  return total;
}

export function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function removePathQuiet(path) {
  if (!existsSync(path)) return false;
  rmSync(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  return true;
}

/**
 * Remove Turbopack / webpack caches when over the threshold (or always when force).
 */
export function pruneDevCaches(options = {}) {
  const force = options.force ?? false;
  const maxBytes = options.maxBytes ?? 350 * 1024 * 1024;
  const removed = [];
  let kept = 0;

  for (const path of DEV_CACHE_PATHS) {
    if (!existsSync(path)) continue;
    if (force) {
      if (removePathQuiet(path)) removed.push(path);
      continue;
    }
    const size = dirSizeBytes(path);
    if (size >= maxBytes) {
      if (removePathQuiet(path)) removed.push(`${path} (${formatMb(size)})`);
    } else {
      kept += size;
    }
  }

  return { removed, keptMb: kept / (1024 * 1024) };
}
