#!/usr/bin/env node
/**
 * Local-friendly Next.js dev entrypoint.
 * - Pins a sane Node heap so Turbopack cannot balloon until the OS thrashing.
 * - Prunes bloated Turbopack/webpack caches (common cause of Windows laptop lag).
 * - Forwards args: `npm run dev -- --port 3001`
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pruneDevCaches } from "./dev-cache.mjs";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const args = process.argv.slice(2);
const forceClean = args.includes("--clean");
const forwarded = args.filter((a) => a !== "--clean");

const { removed, keptMb } = pruneDevCaches({ force: forceClean });
if (removed.length) {
  console.log("[dev] Cleared heavy local caches to reduce CPU/RAM pressure:");
  for (const item of removed) console.log(`  - ${item}`);
} else if (keptMb > 0) {
  console.log(`[dev] Cache OK (${keptMb.toFixed(0)} MB under prune threshold).`);
}

const existing = process.env.NODE_OPTIONS ?? "";
const heapFlag = "--max-old-space-size=";
const nodeOptions = existing.includes(heapFlag)
  ? existing
  : [existing, "--max-old-space-size=3072"].filter(Boolean).join(" ").trim();

const child = spawn(process.execPath, [nextBin, "dev", ...forwarded], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
    // Avoid accidental tracing dumps unless the developer opts in.
    NEXT_TURBOPACK_TRACING: process.env.NEXT_TURBOPACK_TRACING ?? "",
  },
  cwd: process.cwd(),
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
