#!/usr/bin/env node
/** Force-clear local Next.js / Turbopack caches (use when `npm run dev` feels hung). */
import { pruneDevCaches } from "./dev-cache.mjs";

const { removed } = pruneDevCaches({ force: true });
if (removed.length === 0) {
  console.log("[dev:clean] Nothing to clear.");
} else {
  console.log("[dev:clean] Removed:");
  for (const item of removed) console.log(`  - ${item}`);
}
