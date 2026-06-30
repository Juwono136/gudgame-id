import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // firebase-admin is CJS-only; Turbopack must not rewrite its subpath imports to ESM.
  serverExternalPackages: ["firebase-admin"],
  experimental: {
    proxyClientMaxBodySize: "12mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
