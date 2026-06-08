import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const serverOnlyImports = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: [
            "@/db/**",
            "@/lib/redis",
            "@/lib/health/**",
            "@/lib/storage/**",
            "@/lib/config/env.server",
            "@/lib/server/**",
          ],
          message:
            "Do not import server infrastructure from UI components. Use API routes or Server Components in app/.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: serverOnlyImports,
  },
]);

export default eslintConfig;
