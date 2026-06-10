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
            "Do not import server infrastructure from UI components. Use @/lib/media/client, @/lib/domain/*, API routes, or Server Components in app/.",
        },
      ],
    },
  ],
};

/** React Compiler rules — warn only so existing patterns do not block CI. */
const reactCompilerRelaxations = {
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/incompatible-library": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: reactCompilerRelaxations,
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      ...serverOnlyImports,
      ...reactCompilerRelaxations,
    },
  },
]);

export default eslintConfig;
