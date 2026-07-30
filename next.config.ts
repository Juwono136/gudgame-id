import type { NextConfig } from "next";
import path from "node:path";

/**
 * Local-dev performance notes (Windows especially):
 * - Pin `turbopack.root` so the watcher stays inside this app (not parent folders).
 * - Disable Turbopack's persistent FS cache in dev — it grows without bound and
 *   often causes sustained CPU/RAM after mechanism refactors (`npm run dev` lag).
 * - Prefer `npm run dev` (scripts/dev.mjs) which prunes bloated caches on start.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // firebase-admin is CJS-only; Turbopack must not rewrite its subpath imports to ESM.
  serverExternalPackages: ["firebase-admin"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  experimental: {
    proxyClientMaxBodySize: "12mb",
    /** Persistent Turbopack cache causes multi‑GB bloat + idle CPU on Windows. */
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Faster cold route discovery; does not change production behavior.
  onDemandEntries: {
    maxInactiveAge: 30_000,
    pagesBufferLength: 4,
  },
};

export default nextConfig;
